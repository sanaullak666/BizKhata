import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, ArrowLeftRight, Coins, UserCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function MobileBottomNav() {
  const tabs = [
    { label: 'Home', path: '/salesman/home', icon: Home },
    { label: 'Customers', path: '/salesman/customers', icon: Users },
    { label: 'Sales', path: '/salesman/sales', icon: ArrowLeftRight },
    { label: 'Collections', path: '/salesman/collections', icon: Coins },
    { label: 'More', path: '/salesman/profile', icon: UserCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 sm:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                )
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
