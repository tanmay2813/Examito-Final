
import React from 'react';
import { Icon } from './Icon';

export const LeaderboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <Icon {...props}>
    <path d="M6 9H4.5a1.5 1.5 0 0 0 0 3H6v10.5A1.5 1.5 0 0 0 7.5 24h9a1.5 1.5 0 0 0 1.5-1.5V12h1.5a1.5 1.5 0 0 0 0-3H18V1.5A1.5 1.5 0 0 0 16.5 0h-9A1.5 1.5 0 0 0 6 1.5V9z"></path>
    <path d="M12 12H7.5v10.5h9V12H12z"></path>
    <path d="M12 1.5v7.5h4.5V1.5H12z"></path>
  </Icon>
);
