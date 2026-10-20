import React from 'react';
import { createRoot } from 'react-dom/client';
import { TransferPathBoard } from '@actual-board';
import { FixtureControls, installTelemetry } from './boundaries';
import './fixture.css';

installTelemetry();
const element = document.getElementById('root');
if (!element) throw new Error('Fictional fixture root is absent');
createRoot(element).render(<><aside className="fixture-notice">Fictional boundary fixture. Actual TransferPathBoard local state and report props only.</aside><FixtureControls /><TransferPathBoard /></>);

