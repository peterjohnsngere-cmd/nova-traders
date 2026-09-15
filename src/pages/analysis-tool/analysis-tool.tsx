```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import ChartWrapper from '@/pages/chart/chart-wrapper';
import './analysis-tool.scss';

type Tab = 'analysis' | 'scanner';

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

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

const getLastDigit = (quote: number): number => {
    const fixed = quote.toFixed(2);
    const digits = fixed.replace(/\D/g, '');
    return Number(digits[digits.length - 1]);
};

const percentage = (value: number, total: number) =>
    total ? Number(((value / total) * 100).toFixed(1)) : 0;

const AnalysisTool = () => {
    const [activeTab, setActiveTab] = useState<Tab>('analysis');
    const [market, setMarket] = useState('R_75');
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [digits, setDigits] = useState<number[]>([]);
    const [selectedDigit, setSelectedDigit] = useState(5);

    const tickSubscriptionRef = useRef<string | null>(null);

    /*
     * LIVE DERIV TICKS
     */
    useEffect(() => {
        if (!api_base.api) return;

        const api = api_base.api;

        const reset = () => {
            setCurrentPrice(null);
            setDigits([]);
        };

        const subscribe = async () => {
            try {
                if (tickSubscriptionRef.current) {
                    await api.send({
                        forget: tickSubscriptionRef.current,
                    });
                    tickSubscriptionRef.current = null;
                }

                reset();

                const response = await api.send({
                    ticks: market,
                    subscribe: 1,
                });

                if (response?.subscription?.id) {
                    tickSubscriptionRef.current =
                        response.subscription.id;
                }
            } catch (error) {
                console.error(
                    'Nova Traders tick subscription error:',
                    error
                );
            }
        };

        subscribe();

        return () => {
            if (tickSubscriptionRef.current) {
                api
                    .send({
                        forget: tickSubscriptionRef.current,
                    })
                    .catch(() => undefined);

                tickSubscriptionRef.current = null;
            }
        };
    }, [market]);

    /*
     * RECEIVE THE SAME LIVE STREAM
     */
    useEffect(() => {
        if (!api_base.api) return;

        const subscription = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                if (data?.msg_type !== 'tick') return;

                const tick = data.tick;

                if (tick?.symbol !== market) return;

                const quote = Number(tick.quote);

                if (!Number.isFinite(quote)) return;

                const digit = getLastDigit(quote);

                setCurrentPrice(quote);

                setDigits(previous => [
                    ...previous.slice(-99),
                    digit,
                ]);
            });

        return () => {
            subscription?.unsubscribe?.();
        };
    }, [market]);

    /*
     * LIVE ANALYSIS
     */
    const counts = useMemo(() => {
        const result = Array(10).fill(0);

        digits.forEach(digit => {
            result[digit] += 1;
        });

        return result;
    }, [digits]);

    const total = digits.length;

    const digitPercentages = useMemo(
        () =>
            counts.map(count =>
                percentage(count, total)
            ),
        [counts, total]
    );

    const evenCount = digits.filter(
        digit => digit % 2 === 0
    ).length;

    const oddCount = total - evenCount;

    const evenPercentage = percentage(
        evenCount,
        total
    );

    const oddPercentage = percentage(
        oddCount,
        total
    );

    const overCount = digits.filter(
        digit => digit > selectedDigit
    ).length;

    const underCount = digits.filter(
        digit => digit < selectedDigit
    ).length;

    const overPercentage = percentage(
        overCount,
        total
    );

    const underPercentage = percentage(
        underCount,
        total
    );

    const matchesCount = counts[selectedDigit];

    const matchesPercentage = percentage(
        matchesCount,
        total
    );

    const differsPercentage = total
        ? Number((100 - matchesPercentage).toFixed(1))
        : 0;

    const strongestDigit =
        total > 0
            ? digitPercentages.indexOf(
                  Math.max(...digitPercentages)
              )
            : null;

    const weakestDigit =
        total > 0
            ? digitPercentages.indexOf(
                  Math.min(...digitPercentages)
              )
            : null;

    /*
     * E / O SEQUENCE
     *
     * Three E's -> signal O
     * Three O's -> signal E
     */
    const lastThree = digits.slice(-3);

    const threeEven =
        lastThree.length === 3 &&
        lastThree.every(digit => digit % 2 === 0);

    const threeOdd =
        lastThree.length === 3 &&
        lastThree.every(digit => digit % 2 !== 0);

    const sequenceSignal =
        threeEven
            ? 'O'
            : threeOdd
            ? 'E'
            : null;

    const marketLabel =
        MARKETS.find(item => item.value === market)
            ?.label || market;

    const formatPrice = (price: number | null) => {
        if (price === null) return '--';

        return price.toFixed(
            price < 10 ? 3 : 2
        );
    };

    const DigitCircle = ({
        digit,
    }: {
        digit: number;
    }) => (
        <button
            type="button"
            className={`analysis-digit ${
                selectedDigit === digit
                    ? 'selected'
                    : ''
            }`}
            onClick={() =>
                setSelectedDigit(digit)
            }
        >
            <span className="analysis-digit__number">
                {digit}
            </span>

            <span className="analysis-digit__percentage">
                {digitPercentages[digit]}%
            </span>
        </button>
    );

    /*
     * ANALYSIS TOOL
     */
    const renderAnalysis = () => (
        <div className="analysis-tool__workspace">
            <div className="analysis-tool__topbar">
                <div>
                    <span className="analysis-tool__eyebrow">
                        LIVE MARKET ANALYSIS
                    </span>

                    <h1>{marketLabel}</h1>

                    <p>
                        Real-time analysis from the
                        live Deriv tick stream.
                    </p>
                </div>

                <div className="analysis-tool__market-control">
                    <label htmlFor="analysis-market">
                        MARKET
                    </label>

                    <select
                        id="analysis-market"
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

            <div className="analysis-tool__stats">
                <div className="analysis-stat">
                    <span>LIVE PRICE</span>
                    <strong>
                        {formatPrice(currentPrice)}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>TICKS</span>
                    <strong>{total}</strong>
                </div>

                <div className="analysis-stat">
                    <span>STRONGEST</span>
                    <strong>
                        {strongestDigit !== null
                            ? strongestDigit
                            : '--'}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>WEAKEST</span>
                    <strong>
                        {weakestDigit !== null
                            ? weakestDigit
                            : '--'}
                    </strong>
                </div>
            </div>

            <section className="analysis-section analysis-section--chart">
                <div className="analysis-section__heading">
                    <div>
                        <span>01</span>
                        <h2>CHART</h2>
                    </div>

                    <small>LIVE</small>
                </div>

                <div className="analysis-chart">
                    <ChartWrapper
                        prefix="analysis-tool-chart"
                        show_digits_stats={false}
                    />
                </div>
            </section>

            <section className="analysis-section">
                <div className="analysis-section__heading">
                    <div>
                        <span>02</span>
                        <h2>LAST DIGITS</h2>
                    </div>

                    <small>
                        {total} TICKS
                    </small>
                </div>

                <div className="analysis-digit-grid">
                    {DIGITS.map(digit => (
                        <DigitCircle
                            key={digit}
                            digit={digit}
                        />
                    ))}
                </div>
            </section>

            <div className="analysis-two-column">
                {/* OVER / UNDER */}

                <section className="analysis-section">
                    <div className="analysis-section__heading">
                        <div>
                            <span>03</span>
                            <h2>OVER / UNDER</h2>
                        </div>

                        <small>
                            BARRIER {selectedDigit}
                        </small>
                    </div>

                    <div className="barrier-row">
                        {DIGITS.map(digit => (
                            <button
                                key={digit}
                                type="button"
                                className={
                                    selectedDigit ===
                                    digit
                                        ? 'active'
                                        : ''
                                }
                                onClick={() =>
                                    setSelectedDigit(
                                        digit
                                    )
                                }
                            >
                                {digit}
                            </button>
                        ))}
                    </div>

                    <div className="over-under-display">
                        <div
                            className={`analysis-percent-circle ${
                                overPercentage >=
                                underPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <strong>
                                {overPercentage}%
                            </strong>

                            <span>OVER</span>
                        </div>

                        <div
                            className={`analysis-percent-circle ${
                                underPercentage >
                                overPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <strong>
                                {underPercentage}%
                            </strong>

                            <span>UNDER</span>
                        </div>
                    </div>
                </section>

                {/* EVEN / ODD */}

                <section className="analysis-section">
                    <div className="analysis-section__heading">
                        <div>
                            <span>04</span>
                            <h2>EVEN / ODD</h2>
                        </div>

                        <small>
                            LIVE SEQUENCE
                        </small>
                    </div>

                    <div className="even-odd-display">
                        <div
                            className={`even-odd-box ${
                                evenPercentage >=
                                oddPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <span>EVEN</span>

                            <strong>
                                {evenPercentage}%
                            </strong>
                        </div>

                        <div
                            className={`even-odd-box ${
                                oddPercentage >
                                evenPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <span>ODD</span>

                            <strong>
                                {oddPercentage}%
                            </strong>
                        </div>
                    </div>

                    <div className="eo-controls">
                        <button
                            type="button"
                            className={
                                sequenceSignal === 'E'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() => undefined}
                        >
                            E
                        </button>

                        <button
                            type="button"
                            className={
                                sequenceSignal === 'O'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() => undefined}
                        >
                            O
                        </button>
                    </div>

                    <div className="sequence-row">
                        {digits
                            .slice(-12)
                            .map(
                                (
                                    digit,
                                    index
                                ) => (
                                    <span
                                        key={`${digit}-${index}`}
                                        className={
                                            digit %
                                                2 ===
                                            0
                                                ? 'even'
                                                : 'odd'
                                        }
                                    >
                                        {digit}
                                    </span>
                                )
                            )}
                    </div>

                    {sequenceSignal && (
                        <div className="sequence-signal">
                            <strong>
                                {sequenceSignal}
                            </strong>

                            <span>
                                3 consecutive{' '}
                                {sequenceSignal ===
                                'O'
                                    ? 'EVEN'
                                    : 'ODD'}{' '}
                                digits detected
                            </span>
                        </div>
                    )}
                </section>
            </div>

            {/* MATCHES / DIFFERS */}

            <section className="analysis-section">
                <div className="analysis-section__heading">
                    <div>
                        <span>05</span>
                        <h2>
                            MATCHES / DIFFERS
                        </h2>
                    </div>

                    <small>
                        DIGIT {selectedDigit}
                    </small>
                </div>

                <div className="matches-display">
                    {DIGITS.map(digit => (
                        <button
                            key={digit}
                            type="button"
                            className={`matches-digit ${
                                selectedDigit ===
                                digit
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setSelectedDigit(
                                    digit
                                )
                            }
                        >
                            <strong>{digit}</strong>

                            <span>
                                {
                                    digitPercentages[
                                        digit
                                    ]
                                }
                                %
                            </span>
                        </button>
                    ))}
                </div>

                <div className="match-summary">
                    <div>
                        <span>MATCHES</span>

                        <strong>
                            {matchesPercentage}%
                        </strong>
                    </div>

                    <div>
                        <span>DIFFERS</span>

                        <strong>
                            {differsPercentage}%
                        </strong>
                    </div>

                    <div>
                        <span>
                            SELECTED DIGIT
                        </span>

                        <strong>
                            {selectedDigit}
                        </strong>
                    </div>
                </div>
            </section>
        </div>
    );

    /*
     * SCANNER
     *
     * This is intentionally NOT another copy
     * of the Analysis Tool.
     *
     * Its job is to quickly identify digits.
     */
    const renderScanner = () => {
        const sortedDigits = DIGITS
            .map(digit => ({
                digit,
                percentage:
                    digitPercentages[digit],
            }))
            .sort(
                (a, b) =>
                    b.percentage -
                    a.percentage
            );

        const topDigits =
            sortedDigits.slice(0, 3);

        return (
            <div className="analysis-tool__workspace">
                <div className="scanner-header">
                    <div>
                        <span className="analysis-tool__eyebrow">
                            DIGIT SCANNER
                        </span>

                        <h1>{marketLabel}</h1>

                        <p>
                            Quickly scan the live
                            tick stream for the
                            strongest digits.
                        </p>
                    </div>

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

                <section className="scanner-section scanner-section--signal">
                    <div className="scanner-section__heading">
                        <h2>
                            TOP DIGITS
                        </h2>

                        <span>
                            LIVE SCAN
                        </span>
                    </div>

                    <div className="scanner-top-digits">
                        {topDigits.map(
                            item => (
                                <button
                                    key={
                                        item.digit
                                    }
                                    type="button"
                                    className={
                                        selectedDigit ===
                                        item.digit
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() =>
                                        setSelectedDigit(
                                            item.digit
                                        )
                                    }
                                >
                                    <strong>
                                        {
                                            item.digit
                                        }
                                    </strong>

                                    <span>
                                        {
                                            item.percentage
                                        }
                                        %
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                </section>

                <section className="scanner-section">
                    <div className="scanner-section__heading">
                        <h2>
                            ALL DIGITS
                        </h2>

                        <span>
                            {total} TICKS
                        </span>
                    </div>

                    <div className="analysis-digit-grid">
                        {DIGITS.map(
                            digit => (
                                <DigitCircle
                                    key={
                                        digit
                                    }
                                    digit={
                                        digit
                                    }
                                />
                            )
                        )}
                    </div>
                </section>

                <section className="scanner-section">
                    <div className="scanner-section__heading">
                        <h2>
                            CURRENT
                            SCAN
                        </h2>

                        <span>
                            SELECTED{' '}
                            {selectedDigit}
                        </span>
                    </div>

                    <div className="scanner-result">
                        <div>
                            <span>
                                DIGIT
                            </span>

                            <strong>
                                {
                                    selectedDigit
                                }
                            </strong>
                        </div>

                        <div>
                            <span>
                                MATCHES
                            </span>

                            <strong>
                                {
                                    matchesPercentage
                                }
                                %
                            </strong>
                        </div>

                        <div>
                            <span>
                                DIFFERS
                            </span>

                            <strong>
                                {
                                    differsPercentage
                                }
                                %
                            </strong>
                        </div>
                    </div>
                </section>

                <section className="scanner-section">
                    <div className="scanner-section__heading">
                        <h2>
                            RECENT
                            DIGITS
                        </h2>

                        <span>
                            LAST 20
                        </span>
                    </div>

                    <div className="sequence-row sequence-row--large">
                        {digits
                            .slice(-20)
                            .map(
                                (
                                    digit,
                                    index
                                ) => (
                                    <span
                                        key={`${digit}-${index}`}
                                        className={
                                            digit %
                                                2 ===
                                            0
                                                ? 'even'
                                                : 'odd'
                                        }
                                    >
                                        {digit}
                                    </span>
                                )
                            )}
                    </div>
                </section>
            </div>
        );
    };

    return (
        <div className="analysis-tool">
            <div className="analysis-tool__navigation">
                <button
                    type="button"
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
                    type="button"
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

            {activeTab ===
            'analysis'
                ? renderAnalysis()
                : renderScanner()}
        </div>
    );
};

export default AnalysisTool;
```
