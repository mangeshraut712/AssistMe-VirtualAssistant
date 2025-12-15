/**
 * Voice Controls Component
 * Mute button and push-to-talk indicator
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VoiceControls = ({
    isMuted,
    isSpeaking,
    isListening,
    onToggleMute,
    muteMode = 'auto',
    isDark = false
}) => {
    return (
        <div className="flex items-center gap-3">
            {/* Mute Toggle Button */}
            <motion.button
                onClick={onToggleMute}
                className={cn(
                    'relative p-3 rounded-full transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    isDark
                        ? 'bg-white/10 hover:bg-white/20 text-white focus:ring-white/50'
                        : 'bg-black/5 hover:bg-black/10 text-black focus:ring-black/50',
                    isMuted && 'bg-red-500 hover:bg-red-600 text-white'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
                {isMuted ? (
                    <MicOff className="w-5 h-5" />
                ) : (
                    <Mic className="w-5 h-5" />
                )}

                {/* Mute indicator dot */}
                {isMuted && (
                    <motion.span
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-current"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                    />
                )}
            </motion.button>

            {/* AI Speaking Indicator */}
            {isSpeaking && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-full text-sm',
                        isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
                    )}
                >
                    <Volume2 className="w-4 h-4" />
                    <span>AI Speaking...</span>
                    {muteMode === 'auto' && (
                        <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            isDark ? 'bg-white/20' : 'bg-black/10'
                        )}>
                            Mic Muted
                        </span>
                    )}
                </motion.div>
            )}

            {/* Listening Indicator */}
            {isListening && !isMuted && !isSpeaking && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm"
                >
                    <motion.div
                        className="w-2 h-2 rounded-full bg-green-500"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span>Listening...</span>
                </motion.div>
            )}
        </div>
    );
};

export default VoiceControls;
