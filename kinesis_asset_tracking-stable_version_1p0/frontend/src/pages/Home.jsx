import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Activity, AlertTriangle, Users, Box, TrendingUp, ArrowRight, Map, Settings, Thermometer } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [stats, setStats] = useState({
    total_assets: 0,
    active_assets: 0,
    alerts: 0,
    offline_assets: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API}/stats`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, bgColor, link }) => (
    <Card className={`bg-white border-2 ${color} hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-bold text-gray-900 mb-1">{value}</div>
            <Link to={link} className="text-sm text-[#006CDD] hover:underline flex items-center gap-1">
              View details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className={`${bgColor} w-20 h-20 rounded-full flex items-center justify-center`}>
            <Icon className={`w-10 h-10 ${color.replace('border', 'text')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-2xl p-12 border-2 border-blue-200 shadow-lg">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">Assets</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl">Monitor and track all your BLE-tagged assets across your facility </p>
        <div className="flex gap-4">
          <Link 
            to="/rtls" 
            data-testid="hero-rtls-button"
            className="px-8 py-4 bg-[#006CDD] text-white rounded-xl font-semibold hover:bg-[#0056b3] transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <Map className="w-5 h-5" />
            View Live Map
          </Link>
          <Link 
            to="/assets" 
            data-testid="hero-assets-button"
            className="px-8 py-4 bg-white text-[#006CDD] border-2 border-[#006CDD] rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 flex items-center gap-2"
          >
            <Box className="w-5 h-5" />
            Browse Assets
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Assets"
          value={stats.total_assets}
          icon={Box}
          color="border-blue-500"
          bgColor="bg-blue-50"
          link="/assets"
        />
        <StatCard
          title="Active Now"
          value={stats.active_assets}
          icon={Activity}
          color="border-green-500"
          bgColor="bg-green-50"
          link="/rtls"
        />
        <StatCard
          title="Alerts"
          value={stats.alerts}
          icon={AlertTriangle}
          color="border-amber-500"
          bgColor="bg-amber-50"
          link="/assets"
        />
        <StatCard
          title="Offline"
          value={stats.offline_assets}
          icon={Users}
          color="border-gray-500"
          bgColor="bg-gray-50"
          link="/assets"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/rtls" className="group" data-testid="quick-action-rtls">
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-[#006CDD] h-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8 text-[#006CDD]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Tracking</h3>
              <p className="text-gray-600">View real-time asset positions and movement on interactive floor plan</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/assets" className="group" data-testid="quick-action-assets">
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-[#006CDD] h-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Box className="w-8 h-8 text-[#006CDD]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Asset Directory</h3>
              <p className="text-gray-600">Complete searchable list of all tracked assets with detailed information</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/floor-plan" className="group" data-testid="quick-action-floor">
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-[#006CDD] h-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Settings className="w-8 h-8 text-[#006CDD]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Floor Plan Setup</h3>
              <p className="text-gray-600">Configure floor plans, add anchors, and manage facility layout</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/humidity" className="group" data-testid="quick-action-environment">
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-[#006CDD] h-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Thermometer className="w-8 h-8 text-[#006CDD]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tag Telemetry</h3>
              <p className="text-gray-600">View temperature and humidity readings from tag telemetry</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Home;
