import {describe,expect,it} from 'vitest';
import {formatReading,needsAttachmentScreen} from './App';
import type {Reading} from './types';

const reading=(value:number|null,available=true):Reading=>({value,available,source:'test',timestamp:new Date(0).toISOString()});
describe('formatReading',()=>{
  it('renders unavailable values as a dash rather than zero',()=>expect(formatReading(reading(null,false))).toBe('—'));
  it('preserves valid zero values',()=>expect(formatReading(reading(0))).toBe('0'));
  it('applies requested precision',()=>expect(formatReading(reading(13.86),1)).toBe('13.9'));
});
describe('vehicle attachment presentation',()=>{
  it('stays on attachment UI until the controller is connected',()=>{
    expect(needsAttachmentScreen('WAITING_FOR_ADAPTER')).toBe(true);
    expect(needsAttachmentScreen('DISCOVERING_CAPABILITIES')).toBe(true);
    expect(needsAttachmentScreen('CONNECTED')).toBe(false);
  });
});
