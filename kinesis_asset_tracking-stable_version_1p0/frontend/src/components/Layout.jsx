import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Box, Map, Settings, ClipboardCheck, Activity, UserCheck, Thermometer, LocateFixed } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/assets', label: 'Assets', icon: Box },
    { path: '/asset-tracking', label: 'Tracking', icon: LocateFixed },
    { path: '/rtls', label: 'RTLS', icon: Map },
    { path: '/calibration', label: 'Calibration', icon: ClipboardCheck },
    { path: '/ot-status', label: 'OT Status', icon: Activity },
    { path: '/patient-tags', label: 'Patient-Tags', icon: UserCheck },
    { path: '/floor-plan', label: 'Setup', icon: Settings },
    { path: '/humidity', label: 'Telemetry', icon: Thermometer },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src="/kinesis-logo.png" alt="Kinesis Location" className="h-16" />
            </Link>
            
            <nav className="flex items-center space-x-1 overflow-x-auto whitespace-nowrap">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                      isActive
                        ? 'bg-[#006CDD] text-white shadow-md'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-[#006CDD]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1920px] mx-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
