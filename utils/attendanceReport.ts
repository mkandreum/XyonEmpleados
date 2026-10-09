import { FichajeDayStats, VacationRequest } from '../types';

interface AttendanceReportInput {
    employeeName: string;
    monthLabel: string;
    /** 1-12 */
    month: number;
    year: number;
    fichajeDays: Record<string, FichajeDayStats>;
    vacations: VacationRequest[];
    logoUrl?: string;
    /** PNG data URL with the employee signature. */
    signature: string;
}

const formatClock = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** One row per day of the month: [day, entry, exit, hours, incidents, absence]. */
const buildRows = ({ month, year, fichajeDays, vacations }: AttendanceReportInput) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const rows: (string | number)[][] = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const stats = fichajeDays[dateStr];
        let entrada = '';
        let salida = '';
        let horas = '';
        let incidencia = '';
        let ausencia = '';

        const current = new Date(dateStr);
        const vac = vacations.find(v => current >= new Date(v.startDate) && current <= new Date(v.endDate) && v.status === 'APPROVED');
        if (vac) ausencia = vac.type === 'VACATION' ? 'Vacaciones' : 'Ausencia';

        if (stats) {
            if (stats.fichajes && stats.fichajes.length > 0) {
                const ent = stats.fichajes.find(f => f.tipo === 'ENTRADA');
                const sal = stats.fichajes.filter(f => f.tipo === 'SALIDA').pop();
                if (ent) entrada = formatClock(ent.timestamp);
                if (sal) salida = formatClock(sal.timestamp);
            }
            horas = stats.horasTrabajadas.toString();
            if (stats.isLate) incidencia = 'Entrada tarde';
            if (stats.isEarlyDeparture) incidencia += (incidencia ? ', ' : '') + 'Salida temprana';
            if (!stats.isComplete) incidencia += (incidencia ? ', ' : '') + 'Incompleto';
        }

        rows.push([d, entrada, salida, horas, incidencia, ausencia]);
    }
    return rows;
};

/** Builds and downloads the monthly attendance PDF. PDF libraries are loaded on demand. */
export const downloadAttendanceReport = async (input: AttendanceReportInput): Promise<void> => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Reporte de Asistencia', 14, 18);
    doc.setFontSize(12);
    doc.text(`${input.employeeName} - ${input.monthLabel}`, 14, 28);

    if (input.logoUrl) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = input.logoUrl;
            await new Promise((resolve) => { img.onload = resolve; });
            doc.addImage(img, 'PNG', 160, 10, 35, 18);
        } catch { /* the report is still valid without the logo */ }
    }

    autoTable(doc, {
        head: [['Día', 'Entrada', 'Salida', 'Horas', 'Incidencia', 'Ausencia']],
        body: buildRows(input),
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 65, 85] },
    });

    const finalY = (doc as any).lastAutoTable.cursor.y;
    doc.setFontSize(10);
    doc.text('Firma del empleado:', 140, finalY + 20);
    doc.addImage(input.signature, 'PNG', 140, finalY + 22, 40, 20);

    doc.save(`reporte-asistencia-${input.year}-${input.month}.pdf`);
};
