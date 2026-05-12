import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // On mount — check if we have a valid session
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Try to get a new access token via the refresh cookie
                // This also acts as a "Who Am I" check
                const savedUser = localStorage.getItem("hireiq_user");
                if (savedUser) {
                    setUser(JSON.parse(savedUser));
                    setIsAuthenticated(true);
                }
            } catch {
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();

        // Listen for global logout events (from API service)
        const handleLogout = () => logout();
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const login = ({ user: newUser, access_token: accessToken, refresh_token: refreshToken }) => {
        if (newUser) localStorage.setItem("hireiq_user", JSON.stringify(newUser));
        if (accessToken) localStorage.setItem("hireiq_token", accessToken);
        if (refreshToken) localStorage.setItem("hireiq_refresh_token", refreshToken);
        setUser(newUser || null);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            await api.post("/api/auth/logout");
        } catch (e) {
            console.error("Logout failed", e);
        } finally {
            localStorage.removeItem("hireiq_user");
            localStorage.removeItem("hireiq_token");
            localStorage.removeItem("hireiq_refresh_token");
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
};

export default AuthContext;
