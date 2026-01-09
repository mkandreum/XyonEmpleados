import { useState, useEffect } from 'react';

interface GlobalSettings {
    companyName?: string;
    logoUrl?: string;
    adminLogoUrl?: string;
    [key: string]: string | undefined;
}

export const useSettings = () => {
    const [settings, setSettings] = useState<GlobalSettings>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/admin/settings');
                const data = await response.json();

                // Use settings as-is - relative URLs work with Vite proxy
                setSettings(data);
            } catch (error) {
                console.error('❌ Error fetching settings:', error);
                // Use defaults if fetch fails
                setSettings({
                    companyName: 'Velilla',
                    logoUrl: '',
                    adminLogoUrl: ''
                });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    return { settings, loading };
};
