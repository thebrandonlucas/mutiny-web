import { LoadingSpinner, NiceP, SmallAmount, SmallHeader } from './layout';
import { For, Match, ParentComponent, Show, Switch, createMemo, createResource, createSignal } from 'solid-js';
import { useMegaStore } from '~/state/megaStore';
import { MutinyInvoice } from '@mutinywallet/mutiny-wasm';
import { JsonModal } from '~/components/JsonModal';
import mempoolTxUrl from '~/utils/mempoolTxUrl';
import utxoIcon from '~/assets/icons/coin.svg';
import { getRedshifted } from '~/utils/fakeLabels';
import { ActivityItem } from './ActivityItem';
import { MutinyTagItem } from '~/utils/tags';

export const THREE_COLUMNS = 'grid grid-cols-[auto,1fr,auto] gap-4 py-2 px-2 border-b border-neutral-800 last:border-b-0'
export const CENTER_COLUMN = 'min-w-0 overflow-hidden max-w-full'
export const MISSING_LABEL = 'py-1 px-2 bg-white/10 rounded inline-block text-sm'
export const REDSHIFT_LABEL = 'py-1 px-2 bg-white text-m-red rounded inline-block text-sm'
export const RIGHT_COLUMN = 'flex flex-col items-right text-right max-w-[8rem]'

export type OnChainTx = {
    txid: string
    received: number
    sent: number
    fee?: number
    confirmation_time?: {
        "Confirmed"?: {
            height: number
            time: number
        }
    },
    labels: string[]
}

export type UtxoItem = {
    outpoint: string
    txout: {
        value: number
        script_pubkey: string
    }
    keychain: string
    is_spent: boolean,
    redshifted?: boolean,
}

const SubtleText: ParentComponent = (props) => {
    return <h3 class='text-xs text-gray-500 uppercase'>{props.children}</h3>
}

function OnChainItem(props: { item: OnChainTx, labels: MutinyTagItem[] }) {
    const [store, actions] = useMegaStore();
    const isReceive = createMemo(() => props.item.received > 0);

    const [open, setOpen] = createSignal(false)

    return (
        <>
            <JsonModal open={open()} data={props.item} title="On-Chain Transaction" setOpen={setOpen}>
                <a href={mempoolTxUrl(props.item.txid, "signet")} target="_blank" rel="noreferrer">
                    Mempool Link
                </a>
            </JsonModal>
            {/* {JSON.stringify(props.labels)} */}
            <ActivityItem
                kind={"onchain"}
                labels={props.labels}
                amount={isReceive() ? props.item.received : props.item.sent}
                date={props.item.confirmation_time?.Confirmed?.time}
                positive={isReceive()}
                onClick={() => setOpen(!open())}
            />
        </>
    )
}

function InvoiceItem(props: { item: MutinyInvoice, labels: MutinyTagItem[] }) {
    const [store, actions] = useMegaStore();
    const isSend = createMemo(() => props.item.is_send);

    const [open, setOpen] = createSignal(false)

    return (
        <>
            <JsonModal open={open()} data={props.item} title="Lightning Transaction" setOpen={setOpen} />
            <ActivityItem kind={"lightning"} labels={props.labels} amount={props.item.amount_sats || 0n} date={props.item.last_updated} positive={!isSend()} onClick={() => setOpen(!open())} />
        </>
    )
}

function Utxo(props: { item: UtxoItem }) {
    const spent = createMemo(() => props.item.is_spent);

    const [open, setOpen] = createSignal(false)

    const redshifted = createMemo(() => getRedshifted(props.item.outpoint));

    return (
        <>
            <JsonModal open={open()} data={props.item} title="Unspent Transaction Output" setOpen={setOpen} />
            <div class={THREE_COLUMNS} onClick={() => setOpen(!open())}>
                <div class="flex items-center">
                    <img src={utxoIcon} alt="coin" />
                </div>
                <div class={CENTER_COLUMN}>
                    <div class="flex gap-2">
                        <Show when={redshifted()} fallback={<h2 class={MISSING_LABEL}>Unknown</h2>}>
                            <h2 class={REDSHIFT_LABEL}>Redshift</h2>
                        </Show>
                    </div>
                    <SmallAmount amount={props.item.txout.value} />
                </div>
                <div class={RIGHT_COLUMN}>
                    <SmallHeader class={spent() ? "text-m-red" : "text-m-green"}>
                        {/* {spent() ? "SPENT" : "UNSPENT"} */}
                    </SmallHeader>
                </div>
            </div>
        </>
    )
}

type ActivityItem = { type: "onchain" | "lightning", item: OnChainTx | MutinyInvoice, time: number, labels: MutinyTagItem[] }

function sortByTime(a: ActivityItem, b: ActivityItem) {
    return b.time - a.time;
}

export function CombinedActivity(props: { limit?: number }) {
    const [state, actions] = useMegaStore();

    const getAllActivity = async () => {
        console.log("Getting all activity");
        const txs = await state.mutiny_wallet?.list_onchain() as OnChainTx[];
        const invoices = await state.mutiny_wallet?.list_invoices() as MutinyInvoice[];
        const tags = await actions.listTags();

        let activity: ActivityItem[] = [];

        for (let i = 0; i < txs.length; i++) {
            activity.push({ type: "onchain", item: txs[i], time: txs[i].confirmation_time?.Confirmed?.time || Date.now(), labels: [] })
        }

        for (let i = 0; i < invoices.length; i++) {
            if (invoices[i].paid) {
                activity.push({ type: "lightning", item: invoices[i], time: Number(invoices[i].expire), labels: [] })
            }
        }

        if (props.limit) {
            activity = activity.sort(sortByTime).slice(0, props.limit);
        } else {
            activity.sort(sortByTime);
        }

        for (let i = 0; i < activity.length; i++) {
            // filter the tags to only include the ones that have an id matching one of the labels
            activity[i].labels = tags.filter((tag) => activity[i].item.labels.includes(tag.id));
        }

        return activity;
    }

    const [activity] = createResource(getAllActivity);

    return (
        <Switch>
            <Match when={activity.loading}>
                <LoadingSpinner wide />
            </Match>
            <Match when={activity.state === "ready" && activity().length === 0}>
                <NiceP>No activity to show</NiceP>
            </Match>
            <Match when={activity.state === "ready" && activity().length >= 0}>
                <For each={activity()}>
                    {(activityItem) =>
                        <Switch>
                            <Match when={activityItem.type === "onchain"}>
                                {/* FIXME */}
                                <OnChainItem item={activityItem.item as OnChainTx} labels={activityItem.labels} />
                            </Match>
                            <Match when={activityItem.type === "lightning"}>
                                {/* FIXME */}
                                <InvoiceItem item={activityItem.item as MutinyInvoice} labels={activityItem.labels} />
                            </Match>
                        </Switch>
                    }
                </For>
            </Match>
        </Switch>

    )


}