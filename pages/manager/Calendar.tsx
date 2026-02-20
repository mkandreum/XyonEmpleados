import React, { useState } from 'react';
import { TeamCalendar } from './TeamCalendar';
import { Calendar as UserCalendar } from '../Calendar';

const ManagerCalendarPage: React.FC = () => {
	const [view, setView] = useState<'personal' | 'team'>('personal');

	return (
		<div className="space-y-6">
			<div className="flex gap-2 mb-4">
				<button
					className={`px-4 py-2 rounded-full font-semibold transition-colors ${view === 'personal' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white'}`}
					onClick={() => setView('personal')}
				>
					Mi calendario/cuadrante
				</button>
				<button
					className={`px-4 py-2 rounded-full font-semibold transition-colors ${view === 'team' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white'}`}
					onClick={() => setView('team')}
				>
					Calendario de equipo
				</button>
			</div>
			{view === 'personal' && <UserCalendar managerMode />}
			{view === 'team' && <TeamCalendar />}
		</div>
	);
};

export default ManagerCalendarPage;
