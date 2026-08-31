'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function GsapProvider({ children }: { children: React.ReactNode }) {
  // Global configuration for GSAP can go here, like configuring defaults
  return <>{children}</>;
}
