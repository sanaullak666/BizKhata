import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function OwnerLayout() {
  const { user, isOwner } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isOwner) {
    return <Navigate to="/salesman/home" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-200/50 flex flex-col font-sans">
      <Outlet />
    </div>
  );
}
