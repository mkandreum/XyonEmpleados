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

                console.log('🔍 Settings received from API:', data);
                console.log('🌐 Current origin:', window.location.origin);

                // Convert relative URLs to absolute URLs for mobile compatibility
                const processedSettings = { ...data };
                if (data.logoUrl && data.logoUrl.startsWith('/uploads')) {
                    processedSettings.logoUrl = `${window.location.origin}${data.logoUrl}`;
                    console.log('✅ Converted logoUrl:', processedSettings.logoUrl);
                }
                if (data.adminLogoUrl && data.adminLogoUrl.startsWith('/uploads')) {
                    processedSettings.adminLogoUrl = `${window.location.origin}${data.adminLogoUrl}`;
                    console.log('✅ Converted adminLogoUrl:', processedSettings.adminLogoUrl);
                }

                setSettings(processedSettings);
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
