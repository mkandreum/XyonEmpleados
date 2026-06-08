import { useState, useEffect } from 'react';

interface GlobalSettings {
    companyName?: string;
    logoUrl?: string;
    adminLogoUrl?: string;
    departments?: string[];
    [key: string]: string | string[] | undefined;
}

export const useSettings = () => {
    const [settings, setSettings] = useState<GlobalSettings>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/public/logo');
                const data = await response.json();

                const fallbackDepartments = ['IT', 'HR', 'Sales', 'Marketing', 'General'];
                const departments = Array.isArray(data.departments) && data.departments.length > 0
                    ? data.departments
                    : fallbackDepartments;

                // Use settings as-is - relative URLs work with Vite proxy
                setSettings({
                    ...data,
                    departments
                });
            } catch (error) {
                console.error('❌ Error fetching settings:', error);
                // Use defaults if fetch fails
                setSettings({
                    companyName: 'XyonEmpleados',
                    logoUrl: '',
                    adminLogoUrl: '',
                    departments: ['IT', 'HR', 'Sales', 'Marketing', 'General']
                });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    return { settings, loading };
};
