import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { api_base } from '@/external/bot-skeleton';
import ChartWrapper from '@/pages/chart/chart-wrapper';
import './analysis-tool.scss';

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

const DIGITS = Array.from(
    { length: 10 },
    (_, digit) => digit
);

/*
 * Prevent a chart rendering problem from
 * crashing the entire Analysis Tool.
 */
class ChartErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: {
        children: React.ReactNode;
    }) {
        super(props);

        this.state = {
            hasError: false,
        };
    }

    static getDerivedStateFromError() {
        return {
            hasError: true,
        };
    }

    componentDidCatch(error: unknown) {
        console.error(
            'Analysis Tool chart error:',
            error
        );
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '420px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '30px',
                        textAlign: 'center',
                    }}
                >
                    <div>
                        <strong>
                            Chart unavailable
                        </strong>

                        <p>
                            Live tick analysis is still
                            running below.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const AnalysisTool = () => {
    const [activeTab, setActiveTab] =
        useState<'analysis' | 'scanner'>(
            'analysis'
        );

    const [market, setMarket] =
        useState('R_75');

    const [currentPrice, setCurrentPrice] =
        useState<number | null>(null);

    const [digitCounts, setDigitCounts] =
        useState<number[]>(
            Array(10).fill(0)
        );

    const [selectedDigit, setSelectedDigit] =
        useState(5);

    const [apiReady, setApiReady] =
        useState(!!api_base.api);

    const tickSubscriptionRef =
        useRef<any>(null);

    /*
     * Wait for the existing Nova Traders
     * Deriv connection.
     */
    useEffect(() => {
        if (api_base.api) {
            setApiReady(true);
            return;
        }

        const interval =
            window.setInterval(() => {
                if (api_base.api) {
                    setApiReady(true);
                    window.clearInterval(
                        interval
                    );
                }
            }, 500);

        return () =>
            window.clearInterval(
                interval
            );
    }, []);

    /*
     * Subscribe to live ticks.
     */
    useEffect(() => {
        if (
            !apiReady ||
            !api_base.api
        ) {
            return;
        }

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

                setDigitCounts(
                    Array(10).fill(0)
                );

                setCurrentPrice(null);

                const response =
                    await api_base.api.send({
                        ticks: market,
                        subscribe: 1,
                    });

                if (
                    !cancelled &&
                    response?.subscription?.id
                ) {
                    tickSubscriptionRef.current =
                        response.subscription.id;
                }
            } catch (error) {
                console.error(
                    'Analysis Tool subscription error:',
                    error
                );
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
    }, [market, apiReady]);

    /*
     * Receive live ticks.
     */
    useEffect(() => {
        if (
            !apiReady ||
            !api_base.api
        ) {
            return;
        }

        const subscription =
            api_base.api
                .onMessage()
                .subscribe(
                    ({ data }: any) => {
                        if (
                            data?.msg_type !==
                            'tick'
                        ) {
                            return;
                        }

                        const tick =
                            data.tick;

                        if (
                            tick?.symbol &&
                            tick.symbol !==
                                market
                        ) {
                            return;
                        }

                        const quote =
                            Number(
                                tick?.quote
                            );

                        if (
                            !Number.isFinite(
                                quote
                            )
                        ) {
                            return;
                        }

                        setCurrentPrice(
                            quote
                        );

                        /*
                         * Extract the final
                         * digit of the quote.
                         */
                        const digitsOnly =
                            String(
                                quote
                            ).replace(
                                /\D/g,
                                ''
                            );

                        const lastCharacter =
                            digitsOnly.charAt(
                                digitsOnly.length -
                                    1
                            );

                        const lastDigit =
                            Number(
                                lastCharacter
                            );

                        if (
                            Number.isInteger(
                                lastDigit
                            ) &&
                            lastDigit >= 0 &&
                            lastDigit <= 9
                        ) {
                            setDigitCounts(
                                previous => {
                                    const next =
                                        [
                                            ...previous,
                                        ];

                                    next[
                                        lastDigit
                                    ] += 1;

                                    const total =
                                        next.reduce(
                                            (
                                                sum,
                                                value
                                            ) =>
                                                sum +
                                                value,
                                            0
                                        );

                                    /*
                                     * Keep the
                                     * latest 100
                                     * observations.
                                     */
                                    if (
                                        total >
                                        100
                                    ) {
                                        const largestIndex =
                                            next.indexOf(
                                                Math.max(
                                                    ...next
                                                )
                                            );

                                        if (
                                            largestIndex >=
                                            0
                                        ) {
                                            next[
                                                largestIndex
                                            ] = Math.max(
                                                0,
                                                next[
                                                    largestIndex
                                                ] -
                                                    1
                                            );
                                        }
                                    }

                                    return next;
                                }
                            );
                        }
                    }
                );

        return () =>
            subscription?.unsubscribe?.();
    }, [market, apiReady]);

    const totalTicks = useMemo(
        () =>
            digitCounts.reduce(
                (sum, value) =>
                    sum + value,
                0
            ),
        [digitCounts]
    );

    const digitPercentages =
        useMemo(() => {
            if (!totalTicks) {
                return DIGITS.map(
                    () => 0
                );
            }

            return digitCounts.map(
                value =>
                    Math.round(
                        (value /
                            totalTicks) *
                            100
                    )
            );
        }, [
            digitCounts,
            totalTicks,
        ]);

    const evenOdd = useMemo(() => {
        if (!totalTicks) {
            return {
                even: 0,
                odd: 0,
            };
        }

        const even =
            digitCounts.reduce(
                (
                    sum,
                    value,
                    digit
                ) =>
                    sum +
                    (digit % 2 === 0
                        ? value
                        : 0),
                0
            );

        const odd =
            totalTicks - even;

        return {
            even: Math.round(
                (even /
                    totalTicks) *
                    100
            ),
            odd: Math.round(
                (odd /
                    totalTicks) *
                    100
            ),
        };
    }, [
        digitCounts,
        totalTicks,
    ]);

    const overUnder = useMemo(() => {
        if (!totalTicks) {
            return {
                over: 0,
                under: 0,
            };
        }

        const over =
            digitCounts.reduce(
                (
                    sum,
                    value,
                    digit
                ) =>
                    sum +
                    (digit >
                    selectedDigit
                        ? value
                        : 0),
                0
            );

        const under =
            digitCounts.reduce(
                (
                    sum,
                    value,
                    digit
                ) =>
                    sum +
                    (digit <
                    selectedDigit
                        ? value
                        : 0),
                0
            );

        return {
            over: Math.round(
                (over /
                    totalTicks) *
                    100
            ),
            under: Math.round(
                (under /
                    totalTicks) *
                    100
            ),
        };
    }, [
        digitCounts,
        selectedDigit,
        totalTicks,
    ]);

    const matchesDiffers =
        useMemo(() => {
            if (!totalTicks) {
                return {
                    matches: 0,
                    differs: 0,
                };
            }

            const matches =
                digitCounts[
                    selectedDigit
                ] || 0;

            const matchPercentage =
                Math.round(
                    (matches /
                        totalTicks) *
                        100
                );

            return {
                matches:
                    matchPercentage,
                differs:
                    100 -
                    matchPercentage,
            };
        }, [
            digitCounts,
            selectedDigit,
            totalTicks,
        ]);

    const strongestDigit =
        useMemo(() => {
            if (!totalTicks) {
                return null;
            }

            let strongest = 0;

            digitCounts.forEach(
                (value, digit) => {
                    if (
                        value >
                        digitCounts[
                            strongest
                        ]
                    ) {
                        strongest =
                            digit;
                    }
                }
            );

            return strongest;
        }, [
            digitCounts,
            totalTicks,
        ]);

    const weakestDigit =
        useMemo(() => {
            if (!totalTicks) {
                return null;
            }

            let weakest = 0;

            digitCounts.forEach(
                (value, digit) => {
                    if (
                        value <
                        digitCounts[
                            weakest
                        ]
                    ) {
                        weakest =
                            digit;
                    }
                }
            );

            return weakest;
        }, [
            digitCounts,
            totalTicks,
        ]);

    const marketLabel =
        MARKETS.find(
            item =>
                item.value ===
                market
        )?.label || market;

    return (
        <div className='analysis-tool'>
            {/* TOP NAVIGATION */}
            <div className='analysis-tool__tabs'>
                <button
                    type='button'
                    className={
                        activeTab ===
                        'analysis'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab(
                            'analysis'
                        )
                    }
                >
                    ANALYSIS TOOL
                </button>

                <button
                    type='button'
                    className={
                        activeTab ===
                        'scanner'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab(
                            'scanner'
                        )
                    }
                >
                    SCANNER
                </button>
            </div>

            {/* ========================= */}
            {/* ANALYSIS TOOL               */}
            {/* ========================= */}

            {activeTab ===
            'analysis' ? (
                <div className='analysis-tool__content'>
                    <div className='analysis-tool__header'>
                        <div>
                            <h2>
                                Market Analysis
                            </h2>

                            <p>
                                Live Deriv
                                market
                                data
                            </p>
                        </div>

                        <div className='analysis-tool__market'>
                            <label>
                                MARKET
                            </label>

                            <select
                                value={
                                    market
                                }
                                onChange={event =>
                                    setMarket(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {MARKETS.map(
                                    item => (
                                        <option
                                            key={
                                                item.value
                                            }
                                            value={
                                                item.value
                                            }
                                        >
                                            {
                                                item.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    {/* LIVE CHART */}
                    <div className='analysis-tool__chart'>
                        <ChartErrorBoundary>
                            <ChartWrapper
                                show_digits_stats={
                                    true
                                }
                            />
                        </ChartErrorBoundary>
                    </div>

                    {/* LIVE DATA */}
                    <div className='analysis-tool__live'>
                        <div className='analysis-card'>
                            <h3>
                                LIVE PRICE
                            </h3>

                            <div className='tick-value'>
                                {currentPrice !==
                                null
                                    ? currentPrice
                                    : '--'}
                            </div>

                            <small>
                                {
                                    marketLabel
                                }
                            </small>
                        </div>

                        <div className='analysis-card'>
                            <h3>
                                LIVE TICKS
                            </h3>

                            <div className='tick-value'>
                                {
                                    totalTicks
                                }
                            </div>

                            <small>
                                Observations
                            </small>
                        </div>
                    </div>

                    {/* DIGITS */}
                    <div className='analysis-card'>
                        <h3>
                            LAST DIGITS
                        </h3>

                        <p className='analysis-note'>
                            Live frequency
                            from the
                            Deriv tick
                            stream.
                        </p>

                        <div className='digit-circles'>
                            {DIGITS.map(
                                digit => (
                                    <button
                                        type='button'
                                        className={
                                            selectedDigit ===
                                            digit
                                                ? 'digit-circle selected'
                                                : 'digit-circle'
                                        }
                                        key={
                                            digit
                                        }
                                        onClick={() =>
                                            setSelectedDigit(
                                                digit
                                            )
                                        }
                                    >
                                        <span>
                                            {
                                                digit
                                            }
                                        </span>

                                        <small>
                                            {
                                                digitPercentages[
                                                    digit
                                                ]
                                            }
                                            %
                                        </small>
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* ANALYSIS SECTIONS */}
                    <div className='analysis-tool__sections'>
                        {/* OVER UNDER */}
                        <div className='analysis-card'>
                            <h3>
                                OVER /
                                UNDER
                            </h3>

                            <div className='barrier-selector'>
                                <span>
                                    Barrier
                                </span>

                                <div>
                                    {DIGITS.map(
                                        digit => (
                                            <button
                                                type='button'
                                                className={
                                                    selectedDigit ===
                                                    digit
                                                        ? 'active'
                                                        : ''
                                                }
                                                key={
                                                    digit
                                                }
                                                onClick={() =>
                                                    setSelectedDigit(
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

                            <div className='analysis-row'>
                                <span>
                                    OVER{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        overUnder.over
                                    }
                                    %
                                </strong>
                            </div>

                            <div className='analysis-row'>
                                <span>
                                    UNDER{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        overUnder.under
                                    }
                                    %
                                </strong>
                            </div>
                        </div>

                        {/* EVEN ODD */}
                        <div className='analysis-card'>
                            <h3>
                                EVEN /
                                ODD
                            </h3>

                            <div className='analysis-row'>
                                <span>
                                    EVEN
                                </span>

                                <strong>
                                    {
                                        evenOdd.even
                                    }
                                    %
                                </strong>
                            </div>

                            <div className='analysis-row'>
                                <span>
                                    ODD
                                </span>

                                <strong>
                                    {
                                        evenOdd.odd
                                    }
                                    %
                                </strong>
                            </div>
                        </div>

                        {/* MATCHES DIFFERS */}
                        <div className='analysis-card'>
                            <h3>
                                MATCHES /
                                DIFFERS
                            </h3>

                            <div className='analysis-row'>
                                <span>
                                    MATCHES{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        matchesDiffers.matches
                                    }
                                    %
                                </strong>
                            </div>

                            <div className='analysis-row'>
                                <span>
                                    DIFFERS{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        matchesDiffers.differs
                                    }
                                    %
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* SUMMARY */}
                    <div className='analysis-card'>
                        <h3>
                            MARKET
                            SUMMARY
                        </h3>

                        <div className='analysis-summary'>
                            <div>
                                <span>
                                    STRONGEST
                                    DIGIT
                                </span>

                                <strong>
                                    {strongestDigit !==
                                    null
                                        ? strongestDigit
                                        : '--'}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    WEAKEST
                                    DIGIT
                                </span>

                                <strong>
                                    {weakestDigit !==
                                    null
                                        ? weakestDigit
                                        : '--'}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    SELECTED
                                    DIGIT
                                </span>

                                <strong>
                                    {
                                        selectedDigit
                                    }
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ========================= */
                /* SCANNER                    */
                /* ========================= */

                <div className='analysis-tool__scanner'>
                    <div className='analysis-tool__header'>
                        <div>
                            <h2>
                                Scanner
                            </h2>

                            <p>
                                Quick live
                                market
                                scan
                            </p>
                        </div>

                        <div className='analysis-tool__market'>
                            <label>
                                MARKET
                            </label>

                            <select
                                value={
                                    market
                                }
                                onChange={event =>
                                    setMarket(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {MARKETS.map(
                                    item => (
                                        <option
                                            key={
                                                item.value
                                            }
                                            value={
                                                item.value
                                            }
                                        >
                                            {
                                                item.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    <div className='scanner-card'>
                        <h3>
                            MARKET SCAN
                        </h3>

                        <div className='scanner-grid'>
                            <div>
                                <span>
                                    MARKET
                                </span>

                                <strong>
                                    {
                                        marketLabel
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    LIVE
                                    PRICE
                                </span>

                                <strong>
                                    {currentPrice !==
                                    null
                                        ? currentPrice
                                        : '--'}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    SAMPLE
                                </span>

                                <strong>
                                    {
                                        totalTicks
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    STRONGEST
                                </span>

                                <strong>
                                    {strongestDigit !==
                                    null
                                        ? `${strongestDigit} (${digitPercentages[strongestDigit]}%)`
                                        : '--'}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    WEAKEST
                                </span>

                                <strong>
                                    {weakestDigit !==
                                    null
                                        ? `${weakestDigit} (${digitPercentages[weakestDigit]}%)`
                                        : '--'}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    EVEN
                                </span>

                                <strong>
                                    {
                                        evenOdd.even
                                    }
                                    %
                                </strong>
                            </div>

                            <div>
                                <span>
                                    ODD
                                </span>

                                <strong>
                                    {
                                        evenOdd.odd
                                    }
                                    %
                                </strong>
                            </div>

                            <div>
                                <span>
                                    MATCH{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        matchesDiffers.matches
                                    }
                                    %
                                </strong>
                            </div>

                            <div>
                                <span>
                                    DIFFER{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        matchesDiffers.differs
                                    }
                                    %
                                </strong>
                            </div>

                            <div>
                                <span>
                                    OVER{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        overUnder.over
                                    }
                                    %
                                </strong>
                            </div>

                            <div>
                                <span>
                                    UNDER{' '}
                                    {
                                        selectedDigit
                                    }
                                </span>

                                <strong>
                                    {
                                        overUnder.under
                                    }
                                    %
                                </strong>
                            </div>
                        </div>

                        <div className='scanner-digit-selector'>
                            <span>
                                Scan digit
                            </span>

                            <div>
                                {DIGITS.map(
                                    digit => (
                                        <button
                                            type='button'
                                            className={
                                                selectedDigit ===
                                                digit
                                                    ? 'active'
                                                    : ''
                                            }
                                            key={
                                                digit
                                            }
                                            onClick={() =>
                                                setSelectedDigit(
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisTool;
