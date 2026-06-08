import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const DigitalClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-lg">
                <Clock size={32} className="text-blue-400" />
                <div className="font-mono text-4xl font-bold tracking-wider">
                    {formatTime(time)}
                </div>
            </div>
            <p className="text-sm text-slate-600 font-medium capitalize">
                {formatDate(time)}
            </p>
        </div>
    );
};
