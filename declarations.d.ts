declare module 'react' {
    import * as React from 'react';
    export default React;
    export const useState: <T>(initialState: T | (() => T)) => [T, (newState: T | ((prevState: T) => T)) => void];
    export const useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
    export const useContext: <T>(context: any) => T;
    export const useMemo: <T>(factory: () => T, deps?: any[]) => T;
    export const useCallback: <T extends (...args: any[]) => any>(callback: T, deps?: any[]) => T;
    export const useRef: <T>(initialValue: T) => { current: T };
    export const useLayoutEffect: (effect: () => void | (() => void), deps?: any[]) => void;
    export type FC<P = {}> = React.FunctionComponent<P>;
    export type ReactNode = React.ReactNode;
    export type ChangeEvent<T = any> = React.ChangeEvent<T>;
    export type FormEvent<T = any> = React.FormEvent<T>;
    export interface CSSProperties extends React.CSSProperties { }
}

declare module '*/AuthContext' {
    export const useAuth: () => {
        user: any;
        login: (credentials: any) => Promise<void>;
        logout: () => void;
        isAuthenticated: boolean;
    };
}

declare module '*/ThemeContext' {
    export const useTheme: () => {
        theme: 'light' | 'dark';
        isDark: boolean;
        toggleTheme: () => void;
    };
}

declare module 'react-dom' {
    export const render: any;
}

declare module 'react-dom/client' {
    export const createRoot: any;
}

declare module 'react-router-dom' {
    export const Link: any;
    export const useNavigate: any;
    export const useLocation: any;
    export const useParams: any;
    export const BrowserRouter: any;
    export const Routes: any;
    export const Route: any;
    export const Navigate: any;
}

declare module 'lucide-react' {
    export const Clock: any;
    export const AlertCircle: any;
    export const Users: any;
    export const Calendar: any;
    export const Plus: any;
    export const Upload: any;
    export const FileText: any;
    export const Briefcase: any;
    export const Heart: any;
    export const LogOut: any;
    export const User: any;
    export const Moon: any;
    export const Sun: any;
    export const Settings: any;
    export const LayoutDashboard: any;
    export const CalendarDays: any;
    export const Newspaper: any;
    export const UserCircle: any;
    export const MoreHorizontal: any;
    export const ChevronRight: any;
    export const ChevronLeft: any;
    export const ChevronDown: any;
    export const Search: any;
    export const Filter: any;
    export const Trash2: any;
    export const Trash: any;
    export const Edit2: any;
    export const Edit: any;
    export const Check: any;
    export const X: any;
    export const Download: any;
    export const Eye: any;
    export const Save: any;
    export const CheckCircle: any;
    export const XCircle: any;
    export const Plane: any;
    export const AlertTriangle: any;
    export const DollarSign: any;
    export const TrendingUp: any;
    export const CheckSquare: any;
    export const Square: any;
    export const Tag: any;
    export const Mail: any;
    export const Phone: any;
    export const MapPin: any;
    export const Camera: any;
    export const Bell: any;
    export const Terminal: any;
}

declare module 'recharts' {
    export const ResponsiveContainer: any;
    export const AreaChart: any;
    export const Area: any;
    export const XAxis: any;
    export const YAxis: any;
    export const CartesianGrid: any;
    export const Tooltip: any;
    export const BarChart: any;
    export const Bar: any;
    export const PieChart: any;
    export const Pie: any;
    export const Cell: any;
    export const Legend: any;
}

declare module 'axios' {
    const axios: any;
    export default axios;
}

declare module 'react/jsx-runtime' {
    export const jsx: any;
    export const jsxs: any;
    export const Fragment: any;
}
