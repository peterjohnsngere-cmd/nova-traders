import React, { useEffect, useMemo, useRef, useState } from 'react';

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

const CONTRACTS = {
    riseFall: [
        { value: 'CALL', label: 'Rise' },
        { value: 'PUT', label: 'Fall' },
    ],
    overUnder: [
        { value: 'DIGITOVER', label: 'Over' },
        { value: 'DIGITUNDER', label: 'Under' },
    ],
    matchesDiffers: [
        { value: 'DIGITMATCH', label: 'Matches' },
        { value: 'DIGITDIFF', label: 'Differs' },
    ],
    evenOdd: [
        { value: 'DIGITEVEN', label: 'Even' },
        { value: 'DIGITODD', label: 'Odd' },
    ],
};

type TradeMode =
    | 'rise-fall'
    | 'over-under'
    | 'matches-differs'
    | 'even-odd'
    | 'accumulator';

type ContractState = {
    contract_id?: number | string;
    contract_type?: string;
    status?: string;
    buy_price?: number | string;
    bid_price?: number | string;
    sell_price?: number | string;
    profit?: number | string;
    is_valid_to_sell?: number | boolean;
    is_sold?: number | boolean;
    exit_tick?: number | string;
};

const DIGITS = Array.from({ length: 10 }, (_, index) => index);

const ManualTrader = () => {
    const [market, setMarket] = useState('R_75');

    const [tradeMode, setTradeMode] =
        useState<TradeMode>('rise-fall');

    const [contractType, setContractType] = useState('CALL');

    const [selectedDigit, setSelectedDigit] = useState(5);

    const [stake, setStake] = useState(MIN_STAKE);
    const [duration, setDuration] = useState(5);
    const [durationUnit, setDurationUnit] = useState('t');

    const [activeContract, setActiveContract] =
        useState<ContractState | null>(null);

    const [message, setMessage] = useState('');
    const [isBuying, setIsBuying] = useState(false);
    const [isSelling, setIsSelling] = useState(false);

    const [prices, setPrices] = useState<number[]>([]);
    const [digitCounts, setDigitCounts] = useState<number[]>(
        Array(10).fill(0)
    );

    const [currentPrice, setCurrentPrice] = useState<number | null>(
        null
    );

    const messageSubscriptionRef = useRef<any>(null);
    const tickSubscriptionIdRef = useRef<string | number | null>(null);
    const contractSubscriptionRef = useRef<any>(null);

    const isDigitMode =
        tradeMode === 'over-under' ||
        tradeMode === 'matches-differs' ||
        tradeMode === 'even-odd';

    const needsPrediction =
        tradeMode === 'over-under' ||
        tradeMode === 'matches-differs';

    const currentMarketLabel =
        MARKETS.find(item => item.value === market)?.label || market;

    const observedPercentages = useMemo(() => {
        const total = digitCounts.reduce(
            (sum, count) => sum + count,
            0
        );

        if (!total) {
            return DIGITS.map(() => 10);
        }

        return digitCounts.map(count =>
            Math.round((count / total) * 100)
        );
    }, [digitCounts]);

    const chartPoints = useMemo(() => {
        if (!prices.length) return '';

        const width = 800;
        const height = 220;
        const padding = 12;

        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;

        return prices
            .map((price, index) => {
                const x =
                    padding +
                    (index / Math.max(prices.length - 1, 1)) *
                        (width - padding * 2);

                const y =
                    height -
                    padding -
                    ((price - min) / range) *
                        (height - padding * 2);

                return `${x},${y}`;
            })
            .join(' ');
    }, [prices]);

    useEffect(() => {
        if (!api_base.api) return;

        messageSubscriptionRef.current?.unsubscribe?.();

        messageSubscriptionRef.current = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                if (data?.msg_type === 'tick') {
                    const tick = data.tick;

                    if (
                        tick?.symbol &&
                        tick.symbol !== market
                    ) {
                        return;
                    }

                    const quote = Number(tick?.quote);

                    if (!Number.isFinite(quote)) return;

                    setCurrentPrice(quote);

                    setPrices(previous => {
                        const next = [...previous, quote];

                        return next.slice(-45);
                    });

                    const quoteString = String(quote);
                    const digitsOnly =
                        quoteString.replace(/\D/g, '');

                    const lastDigit = Number(
                        digitsOnly.charAt(digitsOnly.length - 1)
                    );

                    if (
                        Number.isInteger(lastDigit) &&
                        lastDigit >= 0 &&
                        lastDigit <= 9
                    ) {
                        setDigitCounts(previous => {
                            const next = [...previous];
                            next[lastDigit] += 1;

                            const total = next.reduce(
                                (sum, count) => sum + count,
                                0
                            );

                            if (total > 100) {
                                const oldestIndex =
                                    next.findIndex(
                                        count => count > 0
                                    );

                                if (oldestIndex >= 0) {
                                    next[oldestIndex] -= 1;
                                }
                            }

                            return next;
                        });
                    }
                }

                const contract =
                    data?.proposal_open_contract;

                if (
                    data?.msg_type ===
                        'proposal_open_contract' &&
                    contract?.contract_id &&
                    activeContract?.contract_id &&
                    contract.contract_id.toString() ===
                        activeContract.contract_id.toString()
                ) {
                    setActiveContract(contract);

                    if (
                        [
                            'won',
                            'lost',
                            'sold',
                            'expired',
                        ].includes(contract.status)
                    ) {
                        setMessage(
                            `Trade finished: ${contract.status.toUpperCase()}`
                        );
                    }
                }
            });

        return () => {
            messageSubscriptionRef.current?.unsubscribe?.();
        };
    }, [market, activeContract?.contract_id]);

    useEffect(() => {
        if (!api_base.api) return;

        const subscribeToMarket = async () => {
            try {
                if (tickSubscriptionIdRef.current) {
                    await api_base.api.send({
                        forget: tickSubscriptionIdRef.current,
                    });
                }

                setPrices([]);
                setDigitCounts(Array(10).fill(0));
                setCurrentPrice(null);

                const response = await api_base.api.send({
                    ticks: market,
                    subscribe: 1,
                });

                if (response?.subscription?.id) {
                    tickSubscriptionIdRef.current =
                        response.subscription.id;
                }
            } catch {
                // The main trading connection remains usable
                // even if the chart stream cannot start.
            }
        };

        subscribeToMarket();

        return () => {
            if (
                tickSubscriptionIdRef.current &&
                api_base.api
            ) {
                api_base.api
                    .send({
                        forget: tickSubscriptionIdRef.current,
                    })
                    .catch(() => undefined);

                tickSubscriptionIdRef.current = null;
            }
        };
    }, [market]);

    useEffect(() => {
        return () => {
            messageSubscriptionRef.current?.unsubscribe?.();
            contractSubscriptionRef.current?.unsubscribe?.();

            if (
                tickSubscriptionIdRef.current &&
                api_base.api
            ) {
                api_base.api
                    .send({
                        forget: tickSubscriptionIdRef.current,
                    })
                    .catch(() => undefined);
            }
        };
    }, []);

    const changeTradeMode = (mode: TradeMode) => {
        setTradeMode(mode);
        setMessage('');

        if (mode === 'rise-fall') {
            setContractType('CALL');
        }

        if (mode === 'over-under') {
            setContractType('DIGITOVER');
        }

        if (mode === 'matches-differs') {
            setContractType('DIGITMATCH');
        }

        if (mode === 'even-odd') {
            setContractType('DIGITEVEN');
        }
    };

    const selectDigit = (digit: number) => {
        setSelectedDigit(digit);

        if (
            contractType === 'DIGITOVER' ||
            contractType === 'DIGITUNDER' ||
            contractType === 'DIGITMATCH' ||
            contractType === 'DIGITDIFF'
        ) {
            setMessage('');
        }
    };

    const startContractUpdates = (
        contractId: number | string
    ) => {
        contractSubscriptionRef.current?.unsubscribe?.();

        if (!api_base.api) return;

        contractSubscriptionRef.current = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                const contract =
                    data?.proposal_open_contract;

                if (
                    data?.msg_type ===
                        'proposal_open_contract' &&
                    contract?.contract_id?.toString() ===
                        contractId.toString()
                ) {
                    setActiveContract(contract);

                    if (
                        [
                            'won',
                            'lost',
                            'sold',
                            'expired',
                        ].includes(contract.status)
                    ) {
                        setMessage(
                            `Trade finished: ${contract.status.toUpperCase()}`
                        );
                    }
                }
            });
    };

    const handleBuy = async () => {
        const finalStake = Math.max(
            MIN_STAKE,
            Number(stake)
        );

        setStake(finalStake);
        setMessage('');

        if (tradeMode === 'accumulator') {
            setMessage(
                'Accumulator trading is being connected separately so we do not send an unsupported contract type to Deriv.'
            );
            return;
        }

        if (!api_base.api) {
            setMessage('Deriv connection is not ready.');
            return;
        }

        if (!api_base.is_authorized) {
            setMessage(
                'Please connect your Deriv account first.'
            );
            return;
        }

        if (!Number.isFinite(finalStake)) {
            setMessage('Enter a valid stake.');
            return;
        }

        if (duration < 1) {
            setMessage(
                'Duration must be at least 1.'
            );
            return;
        }

        if (
            needsPrediction &&
            (selectedDigit < 0 || selectedDigit > 9)
        ) {
            setMessage(
                'Select a digit from 0 to 9.'
            );
            return;
        }

        setIsBuying(true);
        setActiveContract(null);

        try {
            const currency =
                api_base.account_info?.currency;

            if (!currency) {
                throw new Error(
                    'Account currency was not found.'
                );
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
                parameters.barrier = selectedDigit;
            }

            const response =
                await api_base.api.send({
                    buy: '1',
                    price: finalStake,
                    parameters,
                });

            if (response?.error) {
                throw new Error(
                    response.error.message ||
                        'Trade could not be placed.'
                );
            }

            const buy = response?.buy;

            if (!buy?.contract_id) {
                throw new Error(
                    'Deriv did not return a contract ID.'
                );
            }

            const contract: ContractState = {
                contract_id: buy.contract_id,
                contract_type:
                    buy.contract_type ||
                    contractType,
                status: 'open',
                buy_price:
                    buy.buy_price ||
                    finalStake,
                bid_price: buy.bid_price,
                sell_price: buy.sell_price,
                profit: buy.profit,
                is_valid_to_sell:
                    buy.is_valid_to_sell,
            };

            setActiveContract(contract);
            setMessage(
                'Trade placed successfully.'
            );

            startContractUpdates(
                buy.contract_id
            );
        } catch (error: any) {
            setMessage(
                error?.message ||
                    'Something went wrong while placing the trade.'
            );
        } finally {
            setIsBuying(false);
        }
    };

    const handleSell = async () => {
        if (
            !activeContract?.contract_id ||
            !api_base.api
        ) {
            return;
        }

        setIsSelling(true);
        setMessage('');

        try {
            const response =
                await api_base.api.send({
                    sell: activeContract.contract_id,
                    price: 0,
                });

            if (response?.error) {
                throw new Error(
                    response.error.message ||
                        'Contract could not be sold.'
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
            setMessage(
                error?.message ||
                    'Unable to sell the contract.'
            );
        } finally {
            setIsSelling(false);
        }
    };

    const isFinished =
        !!activeContract?.status &&
        [
            'won',
            'lost',
            'sold',
            'expired',
        ].includes(activeContract.status);

    const canSell =
        !!activeContract &&
        !isFinished &&
        Boolean(activeContract.is_valid_to_sell);

    const modeButtons: {
        value: TradeMode;
        label: string;
    }[] = [
        {
            value: 'rise-fall',
            label: 'Rise / Fall',
        },
        {
            value: 'over-under',
            label: 'Over / Under',
        },
        {
            value: 'matches-differs',
            label: 'Matches / Differs',
        },
        {
            value: 'even-odd',
            label: 'Even / Odd',
        },
        {
            value: 'accumulator',
            label: 'Accumulators',
        },
    ];

    const contractButtons =
        tradeMode === 'rise-fall'
            ? CONTRACTS.riseFall
            : tradeMode === 'over-under'
              ? CONTRACTS.overUnder
              : tradeMode ===
                  'matches-differs'
                ? CONTRACTS.matchesDiffers
                : tradeMode === 'even-odd'
                  ? CONTRACTS.evenOdd
                  : [];

    return (
        <div className='manual-trader'>
            <div className='manual-trader__topbar'>
                <div>
                    <div className='manual-trader__eyebrow'>
                        NOVA TRADERS
                    </div>

                    <h1>Manual Trader</h1>

                    <p>
                        Trade directly from your
                        Deriv account.
                    </p>
                </div>

                <div className='manual-trader__market'>
                    <span>Market</span>

                    <select
                        value={market}
                        onChange={event =>
                            setMarket(
                                event.target.value
                            )
                        }
                    >
                        {MARKETS.map(item => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className='manual-trader__modes'>
                {modeButtons.map(mode => (
                    <button
                        key={mode.value}
                        type='button'
                        className={
                            tradeMode === mode.value
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            changeTradeMode(
                                mode.value
                            )
                        }
                    >
                        {mode.label}
                    </button>
                ))}
            </div>

            <div className='manual-trader__layout'>
                <section className='manual-trader__main-card'>
                    <div className='manual-trader__chart-header'>
                        <div>
                            <span className='manual-trader__chart-label'>
                                {currentMarketLabel}
                            </span>

                            <strong>
                                {currentPrice !==
                                null
                                    ? currentPrice.toFixed(
                                          2
                                      )
                                    : '--'}
                            </strong>
                        </div>

                        <div className='manual-trader__live'>
                            <i />
                            LIVE
                        </div>
                    </div>

                    <div className='manual-trader__chart'>
                        <div className='manual-trader__chart-grid'>
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>

                        {prices.length > 1 ? (
                            <svg
                                viewBox='0 0 800 220'
                                preserveAspectRatio='none'
                                className='manual-trader__svg'
                            >
                                <polyline
                                    points={
                                        chartPoints
                                    }
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='3'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                            </svg>
                        ) : (
                            <div className='manual-trader__chart-empty'>
                                Waiting for live market data...
                            </div>
                        )}
                    </div>

                    {isDigitMode && (
                        <div className='manual-trader__digit-section'>
                            <div className='manual-trader__section-heading'>
                                <div>
                                    <strong>
                                        Last Digit
                                    </strong>
                                    <span>
                                        Observed frequency
                                    </span>
                                </div>

                                <span>
                                    {digitCounts.reduce(
                                        (
                                            sum,
                                            count
                                        ) =>
                                            sum +
                                            count,
                                        0
                                    )}{' '}
                                    ticks
                                </span>
                            </div>

                            <div className='manual-trader__digit-wheel'>
                                {DIGITS.map(
                                    digit => (
                                        <button
                                            key={
                                                digit
                                            }
                                            type='button'
                                            className={
                                                selectedDigit ===
                                                digit
                                                    ? 'selected'
                                                    : ''
                                            }
                                            onClick={() =>
                                                selectDigit(
                                                    digit
                                                )
                                            }
                                        >
                                            <span className='manual-trader__digit'>
                                                {
                                                    digit
                                                }
                                            </span>

                                            <span className='manual-trader__percentage'>
                                                {
                                                    observedPercentages[
                                                        digit
                                                    ]
                                                }
                                                %
                                            </span>
                                        </button>
                                    )
                                )}
                            </div>

                            <p className='manual-trader__disclaimer'>
                                Percentages show recent
                                observed last-digit
                                frequency. They are not
                                guaranteed predictions.
                            </p>
                        </div>
                    )}

                    {tradeMode === 'accumulator' && (
                        <div className='manual-trader__accumulator'>
                            <div className='manual-trader__accumulator-icon'>
                                ×
                            </div>

                            <div>
                                <strong>
                                    Accumulator
                                    Trading
                                </strong>

                                <p>
                                    Chart-based
                                    accumulator
                                    interface is ready
                                    here. The buy
                                    request is kept
                                    disabled until the
                                    exact supported
                                    Deriv accumulator
                                    contract parameters
                                    are connected.
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                <aside className='manual-trader__side'>
                    <section className='manual-trader__trade-card'>
                        <div className='manual-trader__card-title'>
                            <div>
                                <span>TRADE</span>
                                <h2>
                                    {tradeMode ===
                                    'rise-fall'
                                        ? 'Rise / Fall'
                                        : tradeMode ===
                                            'over-under'
                                          ? 'Over / Under'
                                          : tradeMode ===
                                              'matches-differs'
                                            ? 'Matches / Differs'
                                            : tradeMode ===
                                                'even-odd'
                                              ? 'Even / Odd'
                                              : 'Accumulator'}
                                </h2>
                            </div>
                        </div>

                        {tradeMode !==
                            'accumulator' && (
                            <>
                                <div className='manual-trader__contract-buttons'>
                                    {contractButtons.map(
                                        contract => (
                                            <button
                                                key={
                                                    contract.value
                                                }
                                                type='button'
                                                className={
                                                    contractType ===
                                                    contract.value
                                                        ? 'active'
                                                        : ''
                                                }
                                                onClick={() =>
                                                    setContractType(
                                                        contract.value
                                                    )
                                                }
                                            >
                                                {
                                                    contract.label
                                                }
                                                {needsPrediction &&
                                                    ` ${selectedDigit}`}
                                            </button>
                                        )
                                    )}
                                </div>

                                {needsPrediction && (
                                    <div className='manual-trader__selected'>
                                        Selected digit:
                                        <strong>
                                            {
                                                selectedDigit
                                            }
                                        </strong>
                                    </div>
                                )}

                                {tradeMode ===
                                    'even-odd' && (
                                    <div className='manual-trader__selected'>
                                        Digit circles are
                                        for market
                                        observation.
                                    </div>
                                )}
                            </>
                        )}

                        <div className='manual-trader__inputs'>
                            <label>
                                <span>
                                    Stake
                                </span>

                                <input
                                    type='number'
                                    min={
                                        MIN_STAKE
                                    }
                                    step='0.01'
                                    value={stake}
                                    onChange={event => {
                                        const value =
                                            Number(
                                                event
                                                    .target
                                                    .value
                                            );

                                        setStake(
                                            Number.isFinite(
                                                value
                                            )
                                                ? Math.max(
                                                      MIN_STAKE,
                                                      value
                                                  )
                                                : MIN_STAKE
                                        );
                                    }}
                                />

                                <small>
                                    Minimum 0.35
                                </small>
                            </label>

                            <label>
                                <span>
                                    Duration
                                </span>

                                <input
                                    type='number'
                                    min='1'
                                    value={
                                        duration
                                    }
                                    onChange={event =>
                                        setDuration(
                                            Math.max(
                                                1,
                                                Number(
                                                    event
                                                        .target
                                                        .value
                                                ) ||
                                                    1
                                            )
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>
                                    Unit
                                </span>

                                <select
                                    value={
                                        durationUnit
                                    }
                                    onChange={event =>
                                        setDurationUnit(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    <option value='t'>
                                        Ticks
                                    </option>
                                    <option value='s'>
                                        Seconds
                                    </option>
                                    <option value='m'>
                                        Minutes
                                    </option>
                                </select>
                            </label>
                        </div>

                        <button
                            type='button'
                            className='manual-trader__buy'
                            onClick={handleBuy}
                            disabled={
                                isBuying ||
                                tradeMode ===
                                    'accumulator'
                            }
                        >
                            {isBuying
                                ? 'BUYING...'
                                : tradeMode ===
                                    'accumulator'
                                  ? 'ACCUMULATOR COMING SOON'
                                  : `BUY ${contractType === 'CALL' ? 'RISE' : contractType === 'PUT' ? 'FALL' : contractType.replace('DIGIT', '')}`}
                        </button>

                        {message && (
                            <div className='manual-trader__message'>
                                {message}
                            </div>
                        )}
                    </section>

                    <section className='manual-trader__contract-card'>
                        <div className='manual-trader__card-title'>
                            <div>
                                <span>
                                    POSITION
                                </span>
                                <h2>
                                    Open Contract
                                </h2>
                            </div>

                            {activeContract && (
                                <span className='manual-trader__status'>
                                    {activeContract.status ||
                                        'OPEN'}
                                </span>
                            )}
                        </div>

                        {!activeContract ? (
                            <div className='manual-trader__empty'>
                                <div className='manual-trader__empty-icon'>
                                    +
                                </div>

                                <strong>
                                    No open contract
                                </strong>

                                <span>
                                    Your active trade
                                    will appear here.
                                </span>
                            </div>
                        ) : (
                            <div className='manual-trader__contract-info'>
                                <div className='manual-trader__result'>
                                    <span>
                                        Profit / Loss
                                    </span>

                                    <strong
                                        className={
                                            Number(
                                                activeContract.profit
                                            ) >=
                                            0
                                                ? 'profit'
                                                : 'loss'
                                        }
                                    >
                                        {activeContract.profit ??
                                            0}
                                    </strong>
                                </div>

                                <div className='manual-trader__info-grid'>
                                    <div>
                                        <span>
                                            Contract
                                        </span>
                                        <strong>
                                            {activeContract.contract_type ||
                                                contractType}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Buy Price
                                        </span>
                                        <strong>
                                            {activeContract.buy_price ??
                                                '-'}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Sell Price
                                        </span>
                                        <strong>
                                            {activeContract.sell_price ??
                                                '-'}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            ID
                                        </span>
                                        <strong>
                                            {
                                                activeContract.contract_id
                                            }
                                        </strong>
                                    </div>
                                </div>

                                {canSell && (
                                    <button
                                        type='button'
                                        className='manual-trader__sell'
                                        onClick={
                                            handleSell
                                        }
                                        disabled={
                                            isSelling
                                        }
                                    >
                                        {isSelling
                                            ? 'SELLING...'
                                            : 'SELL CONTRACT'}
                                    </button>
                                )}

                                {isFinished && (
                                    <div className='manual-trader__finished'>
                                        Result:{' '}
                                        {activeContract.status?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default ManualTrader;
