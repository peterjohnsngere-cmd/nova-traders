import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './bot-editor.scss';

const MARKETS = [
    'Volatility 10',
    'Volatility 25',
    'Volatility 50',
    'Volatility 75',
    'Volatility 100',
    'Volatility 10 (1s)',
    'Volatility 25 (1s)',
    'Volatility 50 (1s)',
    'Volatility 75 (1s)',
    'Volatility 100 (1s)',
];

const TICK_OPTIONS = [1, 2, 3, 4, 5];

type BotLocationState = {
    botId?: string;
    botName?: string;
};

const BotEditor = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const botState = location.state as BotLocationState | null;

    const botId = botState?.botId || 'pulse';
    const botName = botState?.botName || 'Pulse Bot';

    const [market, setMarket] = useState(MARKETS[0]);
    const [contractType, setContractType] = useState('Digits');
    const [stake, setStake] = useState('0.35');
    const [martingale, setMartingale] = useState('1.00');
    const [takeProfit, setTakeProfit] = useState('10');
    const [stopLoss, setStopLoss] = useState('10');
    const [ticks, setTicks] = useState(1);
    const [isRunning, setIsRunning] = useState(false);

    const botDescription = useMemo(() => {
        switch (botId) {
            case 'pulse':
                return 'Analyzes Even/Odd digit behaviour and waits for defined conditions before entering.';
            case 'volt':
                return 'Designed for fast, short-duration tick-based entries.';
            case 'cipher':
                return 'Studies recent tick behaviour and searches for repeating digit patterns.';
            case 'vector':
                return 'Looks at directional market behaviour for potential trading setups.';
            case 'nexus':
                return 'Combines multiple conditions before allowing an entry.';
            case 'prime':
                return 'Focuses on digit behaviour and selective number-based setups.';
            case 'orbit':
                return 'Tracks recent market movement and waits for defined conditions.';
            default:
                return 'Configure this bot before running it.';
        }
    }, [botId]);

    const handleRunBot = () => {
        const stakeValue = Number(stake);
        const martingaleValue = Number(martingale);
        const takeProfitValue = Number(takeProfit);
        const stopLossValue = Number(stopLoss);

        if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
            window.alert('Please enter a valid stake.');
            return;
        }

        if (!Number.isFinite(martingaleValue) || martingaleValue < 1) {
            window.alert('Martingale must be 1.00 or higher.');
            return;
        }

        if (!Number.isFinite(takeProfitValue) || takeProfitValue <= 0) {
            window.alert('Please enter a valid Take Profit.');
            return;
        }

        if (!Number.isFinite(stopLossValue) || stopLossValue <= 0) {
            window.alert('Please enter a valid Stop Loss.');
            return;
        }

        setIsRunning(true);

        console.log('Nova Traders Bot Configuration', {
            botId,
            botName,
            market,
            contractType,
            stake: stakeValue,
            martingale: martingaleValue,
            takeProfit: takeProfitValue,
            stopLoss: stopLossValue,
            ticks,
        });

        window.alert(
            `${botName} is configured and ready to run.\n\n` +
                `Market: ${market}\n` +
                `Ticks: ${ticks}`
        );
    };

    const handleStopBot = () => {
        setIsRunning(false);
    };

    return (
        <div className='bot-editor'>
            <div className='bot-editor__header'>
                <button
                    className='bot-editor__back'
                    onClick={() => navigate('/bots')}
                    type='button'
                >
                    ← Back to Bots
                </button>

                <div className='bot-editor__title'>
                    <div className='bot-editor__icon'>
                        {botName.charAt(0)}
                    </div>

                    <div>
                        <h1>{botName}</h1>
                        <p>{botDescription}</p>
                    </div>
                </div>

                <div
                    className={`bot-editor__status ${
                        isRunning ? 'is-running' : ''
                    }`}
                >
                    <span />
                    {isRunning ? 'RUNNING' : 'READY'}
                </div>
            </div>

            <div className='bot-editor__content'>
                <div className='bot-editor__settings'>
                    <div className='bot-editor__section'>
                        <div className='bot-editor__section-heading'>
                            <h2>Bot Settings</h2>
                            <p>Configure how {botName} will trade.</p>
                        </div>

                        <div className='bot-editor__fields'>
                            <label className='bot-editor__field'>
                                <span>MARKET</span>

                                <select
                                    value={market}
                                    onChange={event =>
                                        setMarket(event.target.value)
                                    }
                                >
                                    {MARKETS.map(item => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className='bot-editor__field'>
                                <span>CONTRACT TYPE</span>

                                <select
                                    value={contractType}
                                    onChange={event =>
                                        setContractType(event.target.value)
                                    }
                                >
                                    <option value='Digits'>Digits</option>
                                </select>
                            </label>

                            <label className='bot-editor__field'>
                                <span>STAKE</span>

                                <input
                                    type='number'
                                    min='0.35'
                                    step='0.01'
                                    value={stake}
                                    onChange={event =>
                                        setStake(event.target.value)
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
                                <span>MARTINGALE</span>

                                <input
                                    type='number'
                                    min='1'
                                    step='0.01'
                                    value={martingale}
                                    onChange={event =>
                                        setMartingale(event.target.value)
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
                                <span>TAKE PROFIT</span>

                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={takeProfit}
                                    onChange={event =>
                                        setTakeProfit(event.target.value)
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
                                <span>STOP LOSS</span>

                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={stopLoss}
                                    onChange={event =>
                                        setStopLoss(event.target.value)
                                    }
                                />
                            </label>

                            <label className='bot-editor__field'>
                                <span>TICKS</span>

                                <select
                                    value={ticks}
                                    onChange={event =>
                                        setTicks(Number(event.target.value))
                                    }
                                >
                                    {TICK_OPTIONS.map(tick => (
                                        <option key={tick} value={tick}>
                                            {tick}{' '}
                                            {tick === 1 ? 'Tick' : 'Ticks'}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className='bot-editor__strategy'>
                        <div>
                            <span>ACTIVE STRATEGY</span>
                            <strong>{botName}</strong>
                        </div>

                        <p>
                            The bot's strategy will be connected to the live
                            Deriv market engine after the editor interface is
                            complete.
                        </p>
                    </div>

                    <div className='bot-editor__actions'>
                        {!isRunning ? (
                            <button
                                className='bot-editor__run'
                                type='button'
                                onClick={handleRunBot}
                            >
                                RUN BOT
                            </button>
                        ) : (
                            <button
                                className='bot-editor__stop'
                                type='button'
                                onClick={handleStopBot}
                            >
                                STOP BOT
                            </button>
                        )}
                    </div>
                </div>

                <aside className='bot-editor__summary'>
                    <div className='bot-editor__summary-header'>
                        <span>BOT SUMMARY</span>
                        <strong>{botName}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Market</span>
                        <strong>{market}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Contract</span>
                        <strong>{contractType}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Stake</span>
                        <strong>${stake || '0.00'}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Martingale</span>
                        <strong>{martingale}x</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Take Profit</span>
                        <strong>${takeProfit || '0.00'}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Stop Loss</span>
                        <strong>${stopLoss || '0.00'}</strong>
                    </div>

                    <div className='bot-editor__summary-item'>
                        <span>Duration</span>
                        <strong>
                            {ticks} {ticks === 1 ? 'Tick' : 'Ticks'}
                        </strong>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default BotEditor;
