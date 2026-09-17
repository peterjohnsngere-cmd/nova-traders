import React from 'react';
import { useNavigate } from 'react-router';
import './bot-page.scss';

type Bot = {
    id: string;
    name: string;
    description: string;
    specialty: string;
};

const BOTS: Bot[] = [
    {
        id: 'pulse',
        name: 'Pulse Bot',
        description:
            'Analyzes Even/Odd digit patterns and looks for selective entry opportunities.',
        specialty: 'Even / Odd',
    },
    {
        id: 'volt',
        name: 'Volt Bot',
        description:
            'A fast-moving strategy bot designed for short tick-based trading.',
        specialty: 'Fast Entries',
    },
    {
        id: 'cipher',
        name: 'Cipher Bot',
        description:
            'Studies recent tick behaviour and searches for repeating digit patterns.',
        specialty: 'Pattern Analysis',
    },
    {
        id: 'vector',
        name: 'Vector Bot',
        description:
            'Uses directional market behaviour to identify potential trading setups.',
        specialty: 'Direction',
    },
    {
        id: 'nexus',
        name: 'Nexus Bot',
        description:
            'Combines multiple market conditions before allowing an entry.',
        specialty: 'Confirmation',
    },
    {
        id: 'prime',
        name: 'Prime Bot',
        description:
            'Focuses on digit behaviour and selective number-based contract setups.',
        specialty: 'Digit Strategy',
    },
    {
        id: 'orbit',
        name: 'Orbit Bot',
        description:
            'Tracks recent market movement and waits for defined conditions before entering.',
        specialty: 'Market Cycles',
    },
];

const BotPage = () => {
    const navigate = useNavigate();

    const handleOpenBot = (bot: Bot) => {
        navigate('/bot-editor', {
            state: {
                botId: bot.id,
                botName: bot.name,
            },
        });
    };

    return (
        <div className='bot-page'>
            <div className='bot-page__header'>
                <div>
                    <h1>Bots</h1>
                    <p>
                        Select a bot to open its editor and configure your
                        trading settings.
                    </p>
                </div>

                <div className='bot-page__count'>
                    {BOTS.length} Bots
                </div>
            </div>

            <div className='bot-page__grid'>
                {BOTS.map(bot => (
                    <div className='bot-card' key={bot.id}>
                        <div className='bot-card__top'>
                            <div className='bot-card__icon'>
                                {bot.name.charAt(0)}
                            </div>

                            <span className='bot-card__status'>
                                READY
                            </span>
                        </div>

                        <div className='bot-card__content'>
                            <h2>{bot.name}</h2>

                            <span className='bot-card__specialty'>
                                {bot.specialty}
                            </span>

                            <p>{bot.description}</p>
                        </div>

                        <button
                            className='bot-card__button'
                            onClick={() => handleOpenBot(bot)}
                            type='button'
                        >
                            OPEN BOT
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BotPage;
