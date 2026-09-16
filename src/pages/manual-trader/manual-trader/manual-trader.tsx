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

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

const MODE_BUTTONS = [
    {
        value: 'over-under' as TradeMode,
        label: 'Over / Under',
    },
    {
        value: 'even-odd' as TradeMode,
        label: 'Even / Odd',
    },
    {
        value: 'matches-differs' as TradeMode,
        label: 'Matches / Differs',
    },
    {
        value: 'rise-fall' as TradeMode,
        label: 'Rise / Fall',
    },
    {
        value: 'accumulator' as TradeMode,
        label: 'Accumulators',
    },
];

const ManualTrader = () => {
    const [market, setMarket] = useState('R_75');

    const [tradeMode, setTradeMode] =
        useState<TradeMode | null>(null);

    const [contractType, setContractType] =
        useState('CALL');

    const [selectedDigit, setSelectedDigit] =
        useState(5);

    const [cursorDigit, setCursorDigit] =
        useState(0);

    const [stake, setStake] =
        useState(MIN_STAKE);

    const [duration, setDuration] =
        useState(5);

    const [durationUnit, setDurationUnit] =
        useState('t');

    const [activeContract, setActiveContract] =
        useState<ContractState | null>(null);

    const [message, setMessage] =
        useState('');

    const [isBuying, setIsBuying] =
        useState(false);

    const [isSelling, setIsSelling] =
        useState(false);

    const [prices, setPrices] =
        useState<number[]>([]);

    const [digitCounts, setDigitCounts] =
        useState<number[]>(
            Array(10).fill(0)
        );

    const [currentPrice, setCurrentPrice] =
        useState<number | null>(null);

    const tickSubscriptionRef =
        useRef<any>(null);

    const contractSubscriptionRef =
        useRef<any>(null);

    const isDigitMode =
        tradeMode === 'over-under' ||
        tradeMode === 'matches-differs' ||
        tradeMode === 'even-odd';

    const needsBarrier =
        tradeMode === 'over-under' ||
        tradeMode === 'matches-differs';

    const showBarrier =
        tradeMode === 'over-under' ||
        tradeMode === 'matches-differs' ||
        tradeMode === 'even-odd';

    const currentMarketLabel =
        MARKETS.find(
            item => item.value === market
        )?.label || market;

    const observedPercentages = useMemo(() => {
        const total = digitCounts.reduce(
            (sum, value) => sum + value,
            0
        );

        if (!total) {
            return DIGITS.map(() => 10);
        }

        return digitCounts.map(value =>
            Math.round(
                (value / total) * 100
            )
        );
    }, [digitCounts]);

    /*
     * RED DIGIT CURSOR
     *
     * This is only a visual helper.
     * It moves across 0-9 continuously.
     * It does NOT change selectedDigit
     * and does NOT change the barrier.
     */
    useEffect(() => {
        if (!isDigitMode) {
            setCursorDigit(0);
            return;
        }

        setCursorDigit(0);

        const interval = window.setInterval(() => {
            setCursorDigit(previous =>
                previous >= 9
                    ? 0
                    : previous + 1
            );
        }, 450);

        return () => {
            window.clearInterval(interval);
        };
    }, [isDigitMode, market]);

    /*
     * Simple live price line used only for
     * Rise/Fall and Accumulator screens.
     */
    const chartPoints = useMemo(() => {
        if (prices.length < 2) return '';

        const width = 900;
        const height = 300;
        const padding = 15;

        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;

        return prices
            .map((price, index) => {
                const x =
                    padding +
                    (index /
                        (prices.length - 1)) *
                        (width - padding * 2);

                const y =
                    height -
                    padding -
                    ((price - min) /
                        range) *
                        (height - padding * 2);

                return `${x},${y}`;
            })
            .join(' ');
    }, [prices]);

    /* LIVE TICK STREAM */
    useEffect(() => {
        if (!api_base.api) return;

        const subscribe = async () => {
            try {
                if (tickSubscriptionRef.current) {
                    await api_base.api.send({
                        forget:
                            tickSubscriptionRef.current,
                    });
                }

                setPrices([]);
                setDigitCounts(
                    Array(10).fill(0)
                );
                setCurrentPrice(null);

                const response =
                    await api_base.api.send({
                        ticks: market,
                        subscribe: 1,
                    });

                if (response?.subscription?.id) {
                    tickSubscriptionRef.current =
                        response.subscription.id;
                }
            } catch {
                // Keep trading connection alive.
            }
        };

        subscribe();

        return () => {
            if (
                tickSubscriptionRef.current &&
                api_base.api
            ) {
                api_base.api
                    .send({
                        forget:
                            tickSubscriptionRef.current,
                    })
                    .catch(() => undefined);

                tickSubscriptionRef.current =
                    null;
            }
        };
    }, [market]);

    /* RECEIVE LIVE TICKS */
    useEffect(() => {
        if (!api_base.api) return;

        const subscription = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                if (data?.msg_type !== 'tick') {
                    return;
                }

                const tick = data.tick;

                if (
                    tick?.symbol &&
                    tick.symbol !== market
                ) {
                    return;
                }

                const quote = Number(
                    tick?.quote
                );

                if (!Number.isFinite(quote)) {
                    return;
                }

                setCurrentPrice(quote);

                setPrices(previous => [
                    ...previous.slice(-59),
                    quote,
                ]);

                const digitsOnly = String(
                    quote
                ).replace(/\D/g, '');

                const lastCharacter =
                    digitsOnly.charAt(
                        digitsOnly.length - 1
                    );

                const lastDigit =
                    Number(lastCharacter);

                if (
                    Number.isInteger(lastDigit) &&
                    lastDigit >= 0 &&
                    lastDigit <= 9
                ) {
                    setDigitCounts(previous => {
                        const next = [...previous];

                        next[lastDigit] += 1;

                        const total =
                            next.reduce(
                                (sum, value) =>
                                    sum + value,
                                0
                            );

                        if (total > 100) {
                            const largestIndex =
                                next.indexOf(
                                    Math.max(
                                        ...next
                                    )
                                );

                            if (
                                largestIndex >= 0
                            ) {
                                next[
                                    largestIndex
                                ] = Math.max(
                                    0,
                                    next[
                                        largestIndex
                                    ] - 1
                                );
                            }
                        }

                        return next;
                    });
                }
            });

        return () => {
            subscription?.unsubscribe?.();
        };
    }, [market]);

    /* LIVE CONTRACT UPDATES */
    useEffect(() => {
        if (!api_base.api) return;

        const subscription = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                const contract =
                    data?.proposal_open_contract;

                if (
                    data?.msg_type !==
                    'proposal_open_contract'
                ) {
                    return;
                }

                if (
                    !contract?.contract_id ||
                    !activeContract?.contract_id
                ) {
                    return;
                }

                if (
                    contract.contract_id.toString() !==
                    activeContract.contract_id.toString()
                ) {
                    return;
                }

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
            });

        return () => {
            subscription?.unsubscribe?.();
        };
    }, [activeContract?.contract_id]);

    const changeTradeMode = (
        mode: TradeMode
    ) => {
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
        setMessage('');
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
                'Accumulator trading is not connected yet.'
            );
            return;
        }

        if (!api_base.api) {
            setMessage(
                'Deriv connection is not ready.'
            );
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
            needsBarrier &&
            (selectedDigit < 0 ||
                selectedDigit > 9)
        ) {
            setMessage(
                'Select a barrier from 0 to 9.'
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

            const parameters: Record<
                string,
                any
            > = {
                amount: finalStake,
                basis: 'stake',
                contract_type:
                    contractType,
                currency,
                duration,
                duration_unit:
                    durationUnit,
                underlying_symbol:
                    market,
            };

            if (needsBarrier) {
                parameters.barrier =
                    selectedDigit;
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

            setActiveContract({
                contract_id:
                    buy.contract_id,
                contract_type:
                    buy.contract_type ||
                    contractType,
                status: 'open',
                buy_price:
                    buy.buy_price ||
                    finalStake,
                bid_price: buy.bid_price,
                sell_price:
                    buy.sell_price,
                profit: buy.profit,
                is_valid_to_sell:
                    buy.is_valid_to_sell,
            });

            setMessage(
                'Trade placed successfully.'
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
                    sell:
                        activeContract.contract_id,
                    price: 0,
                });

            if (response?.error) {
                throw new Error(
                    response.error.message ||
                        'Contract could not be sold.'
                );
            }

            setMessage(
                'Sell request sent.'
            );

            setActiveContract(previous =>
                previous
                    ? {
                          ...previous,
                          status: 'sold',
                          is_sold: 1,
                          is_valid_to_sell: 0,
                      }
                    : null
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
        ].includes(
            activeContract.status
        );

    const canSell =
        !!activeContract &&
        !isFinished &&
        Boolean(
            activeContract.is_valid_to_sell
        );

    const modeTitle =
        tradeMode === 'rise-fall'
            ? 'Rise / Fall'
            : tradeMode === 'over-under'
              ? 'Over / Under'
              : tradeMode ===
                  'matches-differs'
                ? 'Matches / Differs'
                : tradeMode === 'even-odd'
                  ? 'Even / Odd'
                  : tradeMode ===
                      'accumulator'
                    ? 'Accumulators'
                    : '';

    const contractButtons =
        tradeMode === 'rise-fall'
            ? [
                  {
                      value: 'CALL',
                      label: 'Rise',
                  },
                  {
                      value: 'PUT',
                      label: 'Fall',
                  },
              ]
            : tradeMode ===
                'over-under'
              ? [
                    {
                        value: 'DIGITOVER',
                        label: 'Over',
                    },
                    {
                        value: 'DIGITUNDER',
                        label: 'Under',
                    },
                ]
              : tradeMode ===
                  'matches-differs'
                ? [
                      {
                          value: 'DIGITMATCH',
                          label: 'Matches',
                      },
                      {
                          value: 'DIGITDIFF',
                          label: 'Differs',
                      },
                  ]
                : [
                      {
                          value: 'DIGITEVEN',
                          label: 'Even',
                      },
                      {
                          value: 'DIGITODD',
                          label: 'Odd',
                      },
                  ];

    return (
        <div className='manual-trader'>
            <header className='manual-trader__header'>
                <div>
                    <div className='manual-trader__brand'>
                        NOVA TRADERS
                    </div>

                    <h1>Manual Trader</h1>

                    <p>
                        Trade directly from your Deriv
                        account.
                    </p>
                </div>

                <div className='manual-trader__market'>
                    <span>MARKET</span>

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
            </header>

            {!tradeMode && (
                <section className='manual-trader__mode-section'>
                    <div className='manual-trader__mode-heading'>
                        <strong>
                            Choose Contract
                        </strong>

                        <span>
                            Select what you want to trade
                        </span>
                    </div>

                    <nav className='manual-trader__modes'>
                        {MODE_BUTTONS.map(mode => (
                            <button
                                key={mode.value}
                                type='button'
                                onClick={() =>
                                    changeTradeMode(
                                        mode.value
                                    )
                                }
                            >
                                <span>
                                    {mode.label}
                                </span>

                                <strong>
                                    →
                                </strong>
                            </button>
                        ))}
                    </nav>
                </section>
            )}

            {tradeMode && (
                <button
                    type='button'
                    className='manual-trader__back'
                    onClick={() => {
                        setTradeMode(null);
                        setMessage('');
                    }}
                >
                    ← BACK TO CONTRACTS
                </button>
            )}

            {/* DIGIT INTERFACE */}
            {tradeMode && isDigitMode && (
                <div className='manual-trader__digit-page'>
                    <section className='manual-trader__digit-card'>
                        <div className='manual-trader__market-status'>
                            <div>
                                <span>
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

                        <div className='manual-trader__digit-heading'>
                            <strong>
                                Last Digit
                            </strong>

                            <span>
                                {digitCounts.reduce(
                                    (sum, value) =>
                                        sum + value,
                                    0
                                )}{' '}
                                ticks observed
                            </span>
                        </div>

                        <div className='manual-trader__circles'>
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
                                        {cursorDigit ===
                                            digit && (
                                            <span className='manual-trader__digit-cursor'>
                                                ^
                                            </span>
                                        )}

                                        <span className='manual-trader__digit-number'>
                                            {
                                                digit
                                            }
                                        </span>

                                        <small>
                                            {
                                                observedPercentages[
                                                    digit
                                                ]
                                            }
                                            %
                                        </small>
                                    </button>
                                )
                            )}
                        </div>

                        {showBarrier && (
                            <div className='manual-trader__barrier'>
                                <span>
                                    {tradeMode ===
                                    'even-odd'
                                        ? 'SELECT DIGIT'
                                        : 'BARRIER'}
                                </span>

                                <div>
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
                                                        ? 'active'
                                                        : ''
                                                }
                                                onClick={() =>
                                                    selectDigit(
                                                        digit
                                                    )
                                                }
                                            >
                                                {
                                                    digit
                                                }
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        <div className='manual-trader__digit-contracts'>
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

                                        {needsBarrier &&
                                            ` ${selectedDigit}`}
                                    </button>
                                )
                            )}
                        </div>

                        <p className='manual-trader__note'>
                            Percentages show recent
                            observed last-digit
                            frequency. They are not
                            guaranteed predictions.
                        </p>
                    </section>

                    <aside className='manual-trader__trade-panel'>
                        <div className='manual-trader__panel-heading'>
                            <span>TRADE</span>

                            <h2>
                                {modeTitle}
                            </h2>
                        </div>

                        <div className='manual-trader__selected-box'>
                            <span>
                                {needsBarrier
                                    ? 'Selected Barrier'
                                    : 'Selected Digit'}
                            </span>

                            <strong>
                                {selectedDigit}
                            </strong>
                        </div>

                        <div className='manual-trader__inputs'>
                            <label>
                                <span>
                                    STAKE
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
                                    DURATION
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
                                    UNIT
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
                            onClick={
                                handleBuy
                            }
                            disabled={
                                isBuying
                            }
                        >
                            {isBuying
                                ? 'BUYING...'
                                : `BUY ${
                                      contractType ===
                                      'DIGITMATCH'
                                          ? 'MATCH'
                                          : contractType ===
                                              'DIGITDIFF'
                                            ? 'DIFFER'
                                            : contractType.replace(
                                                  'DIGIT',
                                                  ''
                                              )
                                  }`}
                        </button>

                        {message && (
                            <div className='manual-trader__message'>
                                {message}
                            </div>
                        )}
                    </aside>
                </div>
            )}

            {/* CHART INTERFACE */}
            {tradeMode &&
                !isDigitMode && (
                    <div className='manual-trader__chart-page'>
                        <section className='manual-trader__chart-card'>
                            <div className='manual-trader__chart-header'>
                                <div>
                                    <span>
                                        {
                                            currentMarketLabel
                                        }
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
                                    <span />
                                </div>

                                {prices.length >
                                1 ? (
                                    <svg
                                        viewBox='0 0 900 300'
                                        preserveAspectRatio='none'
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
                                    <div>
                                        Waiting for live
                                        market data...
                                    </div>
                                )}
                            </div>

                            {tradeMode ===
                                'accumulator' && (
                                <div className='manual-trader__accumulator-info'>
                                    <strong>
                                        Accumulators
                                    </strong>

                                    <span>
                                        Chart-based
                                        accumulator interface
                                    </span>

                                    <p>
                                        The live chart is
                                        connected. Accumulator
                                        buying remains disabled
                                        until its exact Deriv
                                        contract parameters are
                                        connected.
                                    </p>
                                </div>
                            )}
                        </section>

                        <aside className='manual-trader__trade-panel'>
                            <div className='manual-trader__panel-heading'>
                                <span>
                                    TRADE
                                </span>

                                <h2>
                                    {modeTitle}
                                </h2>
                            </div>

                            {tradeMode ===
                                'rise-fall' && (
                                <div className='manual-trader__rise-fall'>
                                    <button
                                        type='button'
                                        className={
                                            contractType ===
                                            'CALL'
                                                ? 'active rise'
                                                : ''
                                        }
                                        onClick={() =>
                                            setContractType(
                                                'CALL'
                                            )
                                        }
                                    >
                                        <strong>
                                            Rise
                                        </strong>

                                        <span>
                                            CALL
                                        </span>
                                    </button>

                                    <button
                                        type='button'
                                        className={
                                            contractType ===
                                            'PUT'
                                                ? 'active fall'
                                                : ''
                                        }
                                        onClick={() =>
                                            setContractType(
                                                'PUT'
                                            )
                                        }
                                    >
                                        <strong>
                                            Fall
                                        </strong>

                                        <span>
                                            PUT
                                        </span>
                                    </button>
                                </div>
                            )}

                            {tradeMode ===
                                'accumulator' && (
                                <div className='manual-trader__accumulator-disabled'>
                                    <strong>
                                        Accumulator
                                    </strong>

                                    <span>
                                        Trading interface
                                    </span>
                                </div>
                            )}

                            <div className='manual-trader__inputs'>
                                <label>
                                    <span>
                                        STAKE
                                    </span>

                                    <input
                                        type='number'
                                        min={
                                            MIN_STAKE
                                        }
                                        step='0.01'
                                        value={
                                            stake
                                        }
                                        onChange={event =>
                                            setStake(
                                                Math.max(
                                                    MIN_STAKE,
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    ) ||
                                                        MIN_STAKE
                                                )
                                            )
                                        }
                                    />

                                    <small>
                                        Minimum 0.35
                                    </small>
                                </label>

                                <label>
                                    <span>
                                        DURATION
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
                                        UNIT
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
                                    }>
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
                                onClick={
                                    handleBuy
                                }
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
                                      ? 'ACCUMULATOR NOT CONNECTED'
                                      : contractType ===
                                          'CALL'
                                        ? 'BUY RISE'
                                        : 'BUY FALL'}
                            </button>

                            {message && (
                                <div className='manual-trader__message'>
                                    {message}
                                </div>
                            )}
                        </aside>
                    </div>
                )}

            <section className='manual-trader__position'>
                <div className='manual-trader__position-heading'>
                    <div>
                        <span>POSITION</span>

                        <h2>
                            Open Contract
                        </h2>
                    </div>

                    {activeContract && (
                        <strong>
                            {activeContract.status ||
                                'OPEN'}
                        </strong>
                    )}
                </div>

                {!activeContract ? (
                    <div className='manual-trader__empty'>
                        <div>+</div>

                        <strong>
                            No open contract
                        </strong>

                        <span>
                            Your active trade will
                            appear here.
                        </span>
                    </div>
                ) : (
                    <div className='manual-trader__contract-info'>
                        <div className='manual-trader__profit'>
                            <span>
                                Profit / Loss
                            </span>

                            <strong>
                                {activeContract.profit ??
                                    0}
                            </strong>
                        </div>

                        <div className='manual-trader__contract-details'>
                            <div>
                                <span>
                                    CONTRACT
                                </span>

                                <strong>
                                    {activeContract.contract_type ||
                                        contractType}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    BUY PRICE
                                </span>

                                <strong>
                                    {activeContract.buy_price ??
                                        '-'}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    SELL PRICE
                                </span>

                                <strong>
                                    {activeContract.sell_price ??
                                        '-'}
                                </strong>
                            </div>

                            <div>
                                <span>ID</span>

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
                                RESULT:{' '}
                                {activeContract.status?.toUpperCase()}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default ManualTrader;
