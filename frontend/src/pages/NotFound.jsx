/**
 * Not Found (404) Page
 * Visual error fallback displayed when a user navigates to an unrecognized URL route.
 */
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NotFound Component
 * Displays cosmic 404 illustration and return-to-home navigation button.
 */
const NotFound = () => {
    return (
        <div className="py-section-gap max-w-container-max mx-auto px-4 sm:px-edge-margin text-center min-h-[50vh] flex flex-col items-center justify-center">
            <h1 className="font-hero-display text-[2.75rem] sm:text-[4rem] text-error mb-4">404</h1>
            <p className="text-on-surface-variant/80 mb-8 text-lg sm:text-xl">Page not found</p>
            <Link to="/" className="w-full max-w-xs sm:w-auto sm:max-w-none bg-primary-container text-on-primary-container px-7 py-3 rounded-full font-nav-link font-bold hover:scale-105 transition-transform">
                Go Home
            </Link>
        </div>
    );
};

export default NotFound;
