import React, { useEffect, useRef, useState } from 'react';

import { api_base } from '@/external/bot-skeleton';

import './manual-trader.scss';

const MIN_STAKE = 0.35;

const MARKETS = [
    { value: 'R_10', label: 'Volatility 10' },
    { value: 'R_25', label: 'Volatility 25' },
    { value: 'R_50', label: 'Volatility 50' },
    { value: 'R_75', label: 'Volatility 75' },
    { value: 'R_100', label: 'Volatility 100' },
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: 'BOOM1000', label: 'Boom 1000' },
    { value: 'BOOM500', label: 'Boom 500' },
    { value: 'CRASH1000', label: 'Crash 1000' },
    { value: 'CRASH500', label: 'Crash 500' },
];

const CONTRACTS = [
    { value: 'CALL', label: 'Rise' },
    { value: 'PUT', label: 'Fall' },
    { value: 'DIGITEVEN', label: 'Even' },
    { value: 'DIGITODD', label: 'Odd' },
    { value: 'DIGITOVER', label: 'Over' },
    { value: 'DIGITUNDER', label: 'Under' },
    { value: 'DIGITMATCH', label: 'Matches' },
    { value: 'DIGITDIFF', label: 'Differs' },
];

type ContractState = {
    contract_id?: number | string;
    contract_type?: string;
    status?: string;
    buy_price?: number;
    bid_price?: number;
    sell_price?: number;
    profit?: number;
    is_valid_to_sell?: number | boolean;
    is_sold?: number | boolean;
    exit_tick?: number | string;
};

const ManualTrader = () => {
    const [market, setMarket] = useState('R_75');
    const [contractType, setContractType] = useState('CALL');
    const [stake, setStake] = useState(MIN_STAKE);
    const [duration, setDuration] = useState(5);
    const [durationUnit, setDurationUnit] = useState('t');
    const [prediction, setPrediction] = useState(5);

    const [activeContract, setActiveContract] =
        useState<ContractState | null>(null);

    const [message, setMessage] = useState('');
    const [isBuying, setIsBuying] = useState(false);
    const [isSelling, setIsSelling] = useState(false);

    const subscriptionRef = useRef<any>(null);

    const isDigitContract = [
        'DIGITEVEN',
        'DIGITODD',
        'DIGITOVER',
        'DIGITUNDER',
        'DIGITMATCH',
        'DIGITDIFF',
    ].includes(contractType);

    const needsPrediction = [
        'DIGITOVER',
        'DIGITUNDER',
        'DIGITMATCH',
        'DIGITDIFF',
    ].includes(contractType);

    useEffect(() => {
        return () => {
            subscriptionRef.current?.unsubscribe?.();
        };
    }, []);

    const startContractUpdates = (contractId: number | string) => {
        subscriptionRef.current?.unsubscribe?.();

        if (!api_base.api) return;

        subscriptionRef.current = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                const contract = data?.proposal_open_contract;

                if (
                    data?.msg_type === 'proposal_open_contract' &&
                    contract?.contract_id?.toString() === contractId.toString()
                ) {
                    setActiveContract(contract);

                    if (
                        ['won', 'lost', 'sold', 'expired'].includes(
                            contract.status
                        )
                    ) {
                        setMessage(
                            `Trade finished: ${contract.status.toUpperCase()}`
                        );
                    }
                }
            });
    };

    const handleBuy = async () => {
        const finalStake = Math.max(MIN_STAKE, Number(stake));

        setStake(finalStake);
        setMessage('');

        if (!api_base.api) {
            setMessage('Deriv connection is not ready.');
            return;
        }

        if (!api_base.is_authorized) {
            setMessage('Please connect your Deriv account first.');
            return;
        }

        if (!Number.isFinite(finalStake)) {
            setMessage('Enter a valid stake.');
            return;
        }

        if (duration < 1) {
            setMessage('Duration must be at least 1.');
            return;
        }

        if (needsPrediction && (prediction < 0 || prediction > 9)) {
            setMessage('Prediction must be between 0 and 9.');
            return;
        }

        setIsBuying(true);
        setActiveContract(null);

        try {
            const currency = api_base.account_info?.currency;

            if (!currency) {
                throw new Error('Account currency was not found.');
            }

            const parameters: Record<string, any> = {
                amount: finalStake,
                basis: 'stake',
                contract_type: contractType,
                currency,
                duration,
                duration_unit: durationUnit,
                underlying_symbol: market,
            };

            if (needsPrediction) {
                parameters.barrier = prediction;
            }

            const response = await api_base.api.send({
                buy: '1',
                price: finalStake,
                parameters,
            });

            if (response?.error) {
                throw new Error(
                    response.error.message || 'Trade could not be placed.'
                );
            }

            const buy = response?.buy;

            if (!buy?.contract_id) {
                throw new Error('Deriv did not return a contract ID.');
            }

            const contract: ContractState = {
                contract_id: buy.contract_id,
                contract_type: buy.contract_type || contractType,
                status: 'open',
                buy_price: buy.buy_price || finalStake,
                bid_price: buy.bid_price,
                sell_price: buy.sell_price,
                profit: buy.profit,
                is_valid_to_sell: buy.is_valid_to_sell,
            };

            setActiveContract(contract);
            setMessage('Trade placed successfully.');

            startContractUpdates(buy.contract_id);
        } catch (error: any) {
            setMessage(
                error?.message || 'Something went wrong while placing the trade.'
            );
        } finally {
            setIsBuying(false);
        }
    };

    const handleSell = async () => {
        if (!activeContract?.contract_id || !api_base.api) return;

        setIsSelling(true);
        setMessage('');

        try {
            const response = await api_base.api.send({
                sell: activeContract.contract_id,
                price: 0,
            });

            if (response?.error) {
                throw new Error(
                    response.error.message || 'Contract could not be sold.'
                );
            }

            setMessage('Sell request sent.');

            setActiveContract(previous =>
                previous
                    ? {
                          ...previous,
                          status: 'sold',
                          is_sold: 1,
                          is_valid_to_sell: 0,
                      }
                    : previous
            );
        } catch (error: any) {
            setMessage(error?.message || 'Unable to sell the contract.');
        } finally {
            setIsSelling(false);
        }
    };

    const isFinished =
        !!activeContract?.status &&
        ['won', 'lost', 'sold', 'expired'].includes(activeContract.status);

    const canSell =
        !!activeContract &&
        !isFinished &&
        Boolean(activeContract.is_valid_to_sell);

    return (
        <div className='manual-trader'>
            <div className='manual-trader__header'>
                <div>
                    <h1>Manual Trader</h1>
                    <p>Trade directly from Nova Traders.</p>
                </div>
            </div>

            <div className='manual-trader__grid'>
                <section className='manual-trader__card'>
                    <h2>Trade</h2>

                    <label>
                        Market
                        <select
                            value={market}
                            onChange={event => setMarket(event.target.value)}
                        >
                            {MARKETS.map(item => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className='manual-trader__field'>
                        <span>Contract</span>

                        <div className='manual-trader__contract-grid'>
                            {CONTRACTS.map(contract => (
                                <button
                                    key={contract.value}
                                    type='button'
                                    className={
                                        contractType === contract.value
                                            ? 'manual-trader__contract active'
                                            : 'manual-trader__contract'
                                    }
                                    onClick={() =>
                                        setContractType(contract.value)
                                    }
                                >
                                    {contract.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='manual-trader__row'>
                        <label>
                            Stake
                            <input
                                type='number'
                                min={MIN_STAKE}
                                step='0.01'
                                value={stake}
                                onChange={event => {
                                    const value = Number(event.target.value);

                                    setStake(
                                        Number.isFinite(value)
                                            ? Math.max(MIN_STAKE, value)
                                            : MIN_STAKE
                                    );
                                }}
                            />
                            <small>Minimum stake: 0.35</small>
                        </label>

                        <label>
                            Duration
                            <input
                                type='number'
                                min='1'
                                value={duration}
                                onChange={event =>
                                    setDuration(
                                        Math.max(
                                            1,
                                            Number(event.target.value) || 1
                                        )
                                    )
                                }
                            />
                        </label>

                        <label>
                            Unit
                            <select
                                value={durationUnit}
                                onChange={event =>
                                    setDurationUnit(event.target.value)
                                }
                            >
                                <option value='t'>Ticks</option>
                                <option value='s'>Seconds</option>
                                <option value='m'>Minutes</option>
                            </select>
                        </label>
                    </div>

                    {isDigitContract && needsPrediction && (
                        <label>
                            Prediction
                            <select
                                value={prediction}
                                onChange={event =>
                                    setPrediction(Number(event.target.value))
                                }
                            >
                                {Array.from({ length: 10 }, (_, digit) => (
                                    <option key={digit} value={digit}>
                                        {digit}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <button
                        type='button'
                        className='manual-trader__buy'
                        onClick={handleBuy}
                        disabled={isBuying}
                    >
                        {isBuying ? 'BUYING...' : 'BUY'}
                    </button>

                    {message && (
                        <div className='manual-trader__message'>
                            {message}
                        </div>
                    )}
                </section>

                <section className='manual-trader__card'>
                    <h2>Open Contract</h2>

                    {!activeContract ? (
                        <div className='manual-trader__empty'>
                            <strong>No open contract</strong>
                            <span>Your active trade will appear here.</span>
                        </div>
                    ) : (
                        <div className='manual-trader__contract-info'>
                            <p>
                                <strong>Contract:</strong>{' '}
                                {activeContract.contract_type ||
                                    contractType}
                            </p>

                            <p>
                                <strong>ID:</strong>{' '}
                                {activeContract.contract_id}
                            </p>

                            <p>
                                <strong>Status:</strong>{' '}
                                {activeContract.status || 'open'}
                            </p>

                            <p>
                                <strong>Buy Price:</strong>{' '}
                                {activeContract.buy_price ?? '-'}
                            </p>

                            <p>
                                <strong>Current Sell Price:</strong>{' '}
                                {activeContract.sell_price ?? '-'}
                            </p>

                            <p>
                                <strong>Profit/Loss:</strong>{' '}
                                {activeContract.profit ?? 0}
                            </p>

                            {activeContract.exit_tick !== undefined && (
                                <p>
                                    <strong>Exit Tick:</strong>{' '}
                                    {activeContract.exit_tick}
                                </p>
                            )}

                            {canSell && (
                                <button
                                    type='button'
                                    onClick={handleSell}
                                    disabled={isSelling}
                                >
                                    {isSelling ? 'SELLING...' : 'SELL CONTRACT'}
                                </button>
                            )}

                            {isFinished && (
                                <strong>
                                    Result:{' '}
                                    {activeContract.status?.toUpperCase()}
                                </strong>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ManualTrader;
