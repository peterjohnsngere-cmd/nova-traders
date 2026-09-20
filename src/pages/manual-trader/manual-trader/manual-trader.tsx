 import React, { useEffect, useMemo, useRef, useState } from 'react';

import { api_base } from '@/external/bot-skeleton';

import './manual-trader.scss';

const MIN_STAKE = 0.35;
const MAX_DIGIT_SAMPLES = 100;

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

type ContractButton = {
value: string;
label: string;
};

type ProposalQuote = {
payout: number | null;
loading: boolean;
error?: string;
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

const TICK_OPTIONS = [1, 2, 3, 4, 5];

const getLastDigit = (
value: unknown,
pipSize?: unknown
): number | null => {
const numericValue = Number(value);

```
if (!Number.isFinite(numericValue)) {
    return null;
}

const precision = Number(pipSize);

if (
    Number.isInteger(precision) &&
    precision >= 0 &&
    precision <= 10
) {
    const multiplier = 10 ** precision;
    const scaledValue = Math.round(
        numericValue * multiplier
    );

    return Math.abs(scaledValue) % 10;
}

const stringValue = String(value);

const decimalPart =
    stringValue.split('.')[1] || '';

if (decimalPart.length > 0) {
    const lastCharacter =
        decimalPart.charAt(
            decimalPart.length - 1
        );

    const digit = Number(lastCharacter);

    if (
        Number.isInteger(digit) &&
        digit >= 0 &&
        digit <= 9
    ) {
        return digit;
    }
}

const digitsOnly =
    stringValue.replace(/\D/g, '');

if (!digitsOnly) {
    return null;
}

const lastCharacter =
    digitsOnly.charAt(
        digitsOnly.length - 1
    );

const digit = Number(lastCharacter);

return Number.isInteger(digit) &&
    digit >= 0 &&
    digit <= 9
    ? digit
    : null;
```

};

const buildDigitCounts = (
history: number[]
) => {
const counts = Array(10).fill(0);

```
history.forEach(digit => {
    if (
        Number.isInteger(digit) &&
        digit >= 0 &&
        digit <= 9
    ) {
        counts[digit] += 1;
    }
});

return counts;
```

};

const getContractButtonsForMode = (
mode: TradeMode | null
): ContractButton[] => {
if (mode === 'rise-fall') {
return [
{
value: 'CALL',
label: 'Rise',
},
{
value: 'PUT',
label: 'Fall',
},
];
}

```
if (mode === 'over-under') {
    return [
        {
            value: 'DIGITOVER',
            label: 'Over',
        },
        {
            value: 'DIGITUNDER',
            label: 'Under',
        },
    ];
}

if (mode === 'matches-differs') {
    return [
        {
            value: 'DIGITMATCH',
            label: 'Matches',
        },
        {
            value: 'DIGITDIFF',
            label: 'Differs',
        },
    ];
}

if (mode === 'even-odd') {
    return [
        {
            value: 'DIGITEVEN',
            label: 'Even',
        },
        {
            value: 'DIGITODD',
            label: 'Odd',
        },
    ];
}

return [];
```

};

const formatPayout = (
value: number | null
) => {
if (
value === null ||
!Number.isFinite(value)
) {
return '--';
}

```
return value.toFixed(2);
```

};

const ManualTrader = () => {
const [market, setMarket] = useState('R_75');

```
const [tradeMode, setTradeMode] =
    useState<TradeMode | null>(null);

const [contractType, setContractType] =
    useState('CALL');

const [selectedDigit, setSelectedDigit] =
    useState(5);

const [cursorDigit, setCursorDigit] =
    useState(0);

const [previousTickDigit, setPreviousTickDigit] =
    useState<number | null>(null);

const [stake, setStake] =
    useState(MIN_STAKE);

const [duration, setDuration] =
    useState(5);

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

const [proposalQuotes, setProposalQuotes] =
    useState<Record<string, ProposalQuote>>(
        {}
    );

const tickSubscriptionRef =
    useRef<any>(null);

const digitHistoryRef =
    useRef<number[]>([]);

const pipSizeRef =
    useRef<number | null>(null);

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

const observedTickCount =
    digitCounts.reduce(
        (sum, value) => sum + value,
        0
    );

const observedPercentages = useMemo(() => {
    const total =
        digitCounts.reduce(
            (sum, value) => sum + value,
            0
        );

    if (
        total < MAX_DIGIT_SAMPLES
    ) {
        return DIGITS.map(() => 0);
    }

    const exactPercentages =
        digitCounts.map(
            value =>
                (value / total) * 100
        );

    const percentages =
        exactPercentages.map(value =>
            Math.floor(value)
        );

    let remaining =
        100 -
        percentages.reduce(
            (sum, value) => sum + value,
            0
        );

    const remainderIndexes =
        exactPercentages
            .map((value, index) => ({
                index,
                remainder:
                    value -
                    Math.floor(value),
            }))
            .sort(
                (a, b) =>
                    b.remainder -
                    a.remainder
            );

    let position = 0;

    while (
        remaining > 0 &&
        remainderIndexes.length > 0
    ) {
        percentages[
            remainderIndexes[
                position %
                    remainderIndexes.length
            ].index
        ] += 1;

        remaining -= 1;
        position += 1;
    }

    return percentages;
}, [digitCounts]);

useEffect(() => {
    if (!isDigitMode) {
        setCursorDigit(0);
        setPreviousTickDigit(null);
    }
}, [isDigitMode]);

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

const latestDigitMatchesContract =
    useMemo(() => {
        if (cursorDigit === null) {
            return false;
        }

        if (
            contractType ===
            'DIGITOVER'
        ) {
            return cursorDigit > selectedDigit;
        }

        if (
            contractType ===
            'DIGITUNDER'
        ) {
            return cursorDigit < selectedDigit;
        }

        if (
            contractType ===
            'DIGITMATCH'
        ) {
            return cursorDigit === selectedDigit;
        }

        if (
            contractType ===
            'DIGITDIFF'
        ) {
            return cursorDigit !== selectedDigit;
        }

        if (
            contractType ===
            'DIGITEVEN'
        ) {
            return cursorDigit % 2 === 0;
        }

        if (
            contractType ===
            'DIGITODD'
        ) {
            return cursorDigit % 2 !== 0;
        }

        return false;
    }, [
        cursorDigit,
        contractType,
        selectedDigit,
    ]);

useEffect(() => {
    if (!api_base.api) return;

    let cancelled = false;

    const subscribe = async () => {
        try {
            if (
                tickSubscriptionRef.current
            ) {
                await api_base.api.send({
                    forget:
                        tickSubscriptionRef.current,
                });

                tickSubscriptionRef.current =
                    null;
            }

            digitHistoryRef.current = [];
            pipSizeRef.current = null;

            setPrices([]);
            setDigitCounts(
                Array(10).fill(0)
            );
            setCurrentPrice(null);
            setCursorDigit(0);
            setPreviousTickDigit(null);
            setMessage('');

            const historyResponse =
                await api_base.api.send({
                    ticks_history: market,
                    count: MAX_DIGIT_SAMPLES,
                    end: 'latest',
                    style: 'ticks',
                });

            if (cancelled) {
                return;
            }

            if (
                historyResponse?.error
            ) {
                throw new Error(
                    historyResponse.error.message ||
                        'Unable to load market history.'
                );
            }

            const historicalPrices =
                Array.isArray(
                    historyResponse?.history
                        ?.prices
                )
                    ? historyResponse.history
                          .prices
                    : Array.isArray(
                          historyResponse?.prices
                      )
                      ? historyResponse.prices
                      : [];

            const historyPipSize =
                Number(
                    historyResponse?.pip_size
                );

            if (
                Number.isInteger(
                    historyPipSize
                ) &&
                historyPipSize >= 0
            ) {
                pipSizeRef.current =
                    historyPipSize;
            }

            const historicalDigits =
                historicalPrices
                    .map(price =>
                        getLastDigit(
                            price,
                            historyResponse?.pip_size
                        )
                    )
                    .filter(
                        (
                            digit
                        ): digit is number =>
                            digit !== null
                    )
                    .slice(
                        -MAX_DIGIT_SAMPLES
                    );

            digitHistoryRef.current =
                historicalDigits;

            setDigitCounts(
                buildDigitCounts(
                    historicalDigits
                )
            );

            if (
                historicalDigits.length > 0
            ) {
                const latestHistoricalDigit =
                    historicalDigits[
                        historicalDigits.length -
                            1
                    ];

                setCursorDigit(
                    latestHistoricalDigit
                );

                if (
                    historicalDigits.length > 1
                ) {
                    setPreviousTickDigit(
                        historicalDigits[
                            historicalDigits.length -
                                2
                        ]
                    );
                }
            }

            const numericHistoricalPrices =
                historicalPrices
                    .map(price =>
                        Number(price)
                    )
                    .filter(price =>
                        Number.isFinite(
                            price
                        )
                    );

            if (
                numericHistoricalPrices.length >
                0
            ) {
                const latestHistoricalPrice =
                    numericHistoricalPrices[
                        numericHistoricalPrices.length -
                            1
                    ];

                setCurrentPrice(
                    latestHistoricalPrice
                );

                setPrices(
                    numericHistoricalPrices.slice(
                        -60
                    )
                );
            }

            if (
                historicalDigits.length <
                MAX_DIGIT_SAMPLES
            ) {
                setMessage(
                    `Loaded ${historicalDigits.length} valid ticks. Waiting for 100 valid ticks for the digit percentages.`
                );
            }

            const response =
                await api_base.api.send({
                    ticks: market,
                    subscribe: 1,
                });

            if (cancelled) {
                return;
            }

            if (
                response?.error
            ) {
                throw new Error(
                    response.error.message ||
                        'Unable to subscribe to live ticks.'
                );
            }

            if (
                response?.subscription?.id
            ) {
                tickSubscriptionRef.current =
                    response.subscription.id;
            }
        } catch (
            error: any
        ) {
            if (!cancelled) {
                setDigitCounts(
                    Array(10).fill(0)
                );

                setCursorDigit(0);
                setPreviousTickDigit(null);

                setMessage(
                    error?.message ||
                        'Unable to load market data.'
                );
            }
        }
    };

    subscribe();

    return () => {
        cancelled = true;

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

useEffect(() => {
    if (!api_base.api) return;

    const subscription = api_base.api
        .onMessage()
        .subscribe(({ data }: any) => {
            if (
                data?.msg_type !==
                'tick'
            ) {
                return;
            }

            const tick = data.tick;

            if (
                tick?.symbol &&
                tick.symbol !== market
            ) {
                return;
            }

            const quote =
                Number(tick?.quote);

            if (
                !Number.isFinite(
                    quote
                )
            ) {
                return;
            }

            if (
                tick?.pip_size !==
                    undefined &&
                Number.isInteger(
                    Number(
                        tick.pip_size
                    )
                )
            ) {
                pipSizeRef.current =
                    Number(
                        tick.pip_size
                    );
            }

            setCurrentPrice(quote);

            setPrices(previous => [
                ...previous.slice(-59),
                quote,
            ]);

            const lastDigit =
                getLastDigit(
                    tick?.quote,
                    tick?.pip_size ??
                        pipSizeRef.current
                );

            if (
                lastDigit === null
            ) {
                return;
            }

            const history =
                digitHistoryRef.current;

            const previousDigit =
                history.length > 0
                    ? history[
                          history.length - 1
                      ]
                    : null;

            setPreviousTickDigit(
                previousDigit
            );

            setCursorDigit(lastDigit);

            history.push(lastDigit);

            if (
                history.length >
                MAX_DIGIT_SAMPLES
            ) {
                history.shift();
            }

            setDigitCounts(
                buildDigitCounts(
                    history
                )
            );
        });

    return () => {
        subscription?.unsubscribe?.();
    };
}, [market]);

useEffect(() => {
    if (
        !api_base.api ||
        !tradeMode ||
        tradeMode === 'accumulator'
    ) {
        setProposalQuotes({});
        return;
    }

    const currency =
        api_base.account_info
            ?.currency;

    if (!currency) {
        setProposalQuotes({});
        return;
    }

    const numericStake =
        Number(stake);

    const finalStake =
        Number.isFinite(
            numericStake
        ) &&
        numericStake >= MIN_STAKE
            ? numericStake
            : MIN_STAKE;

    const contracts =
        getContractButtonsForMode(
            tradeMode
        );

    if (
        contracts.length === 0
    ) {
        setProposalQuotes({});
        return;
    }

    let cancelled = false;

    const timeout = setTimeout(
        async () => {
            const loadingQuotes: Record<
                string,
                ProposalQuote
            > = {};

            contracts.forEach(
                contract => {
                    loadingQuotes[
                        contract.value
                    ] = {
                        payout: null,
                        loading: true,
                    };
                }
            );

            setProposalQuotes(
                loadingQuotes
            );

            const results =
                await Promise.all(
                    contracts.map(
                        async contract => {
                            try {
                                const parameters: Record<
                                    string,
                                    any
                                > = {
                                    amount:
                                        finalStake,
                                    basis: 'stake',
                                    contract_type:
                                        contract.value,
                                    currency,
                                    duration,
                                    duration_unit:
                                        't',
                                    underlying_symbol:
                                        market,
                                };

                                if (
                                    needsBarrier
                                ) {
                                    parameters.barrier =
                                        selectedDigit;
                                }

                                const response =
                                    await api_base.api.send(
                                        {
                                            proposal:
                                                1,
                                            ...parameters,
                                        }
                                    );

                                if (
                                    response?.error
                                ) {
                                    throw new Error(
                                        response
                                            .error
                                            .message ||
                                            'Payout unavailable.'
                                    );
                                }

                                const payout =
                                    Number(
                                        response
                                            ?.proposal
                                            ?.payout
                                    );

                                if (
                                    !Number.isFinite(
                                        payout
                                    )
                                ) {
                                    throw new Error(
                                        'Payout was not returned.'
                                    );
                                }

                                return [
                                    contract.value,
                                    {
                                        payout,
                                        loading:
                                            false,
                                    },
                                ] as const;
                            } catch (
                                error: any
                            ) {
                                return [
                                    contract.value,
                                    {
                                        payout:
                                            null,
                                        loading:
                                            false,
                                        error:
                                            error?.message ||
                                            'Payout unavailable.',
                                    },
                                ] as const;
                            }
                        }
                    )
                );

            if (cancelled) {
                return;
            }

            const nextQuotes: Record<
                string,
                ProposalQuote
            > = {};

            results.forEach(
                ([contractType, quote]) => {
                    nextQuotes[
                        contractType
                    ] = quote;
                }
            );

            setProposalQuotes(
                nextQuotes
            );
        },
        300
    );

    return () => {
        cancelled = true;
        clearTimeout(timeout);
    };
}, [
    market,
    tradeMode,
    selectedDigit,
    duration,
    stake,
    api_base.account_info?.currency,
    needsBarrier,
]);

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
                ].includes(
                    contract.status
                )
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
    setProposalQuotes({});

    if (mode === 'rise-fall') {
        setContractType('CALL');
    }

    if (mode === 'over-under') {
        setContractType('DIGITOVER');
    }

    if (
        mode === 'matches-differs'
    ) {
        setContractType(
            'DIGITMATCH'
        );
    }

    if (mode === 'even-odd') {
        setContractType(
            'DIGITEVEN'
        );
    }
};

const selectDigit = (
    digit: number
) => {
    setSelectedDigit(digit);
    setMessage('');
};

const handleBuy = async () => {
    const finalStake =
        Math.max(
            MIN_STAKE,
            Number(stake)
        );

    setStake(finalStake);
    setMessage('');

    if (
        tradeMode ===
        'accumulator'
    ) {
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

    if (
        !Number.isFinite(
            finalStake
        )
    ) {
        setMessage(
            'Enter a valid stake.
```
