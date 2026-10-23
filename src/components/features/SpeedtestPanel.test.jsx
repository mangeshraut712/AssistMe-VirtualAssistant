import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpeedtestPanel from './SpeedtestPanel';

vi.mock('recharts', () => {
    const Passthrough = ({ children }) => children ?? null;
    return {
        ResponsiveContainer: Passthrough,
        AreaChart: Passthrough,
        Area: () => null,
        RadarChart: Passthrough,
        PolarGrid: () => null,
        PolarAngleAxis: () => null,
        PolarRadiusAxis: () => null,
        Radar: () => null,
    };
});

describe('SpeedtestPanel', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn(async (url) => {
            if (String(url).includes('ipapi.co')) {
                return {
                    json: async () => ({
                        ip: '203.0.113.10',
                        city: 'Philadelphia',
                        org: 'Test ISP',
                        country_name: 'United States',
                        asn: 'AS1',
                    }),
                };
            }
            return { json: async () => ({}) };
        }));
    });

    it('shows history saved from an earlier session when the panel opens', () => {
        localStorage.setItem('speedtest_v8', JSON.stringify([
            {
                id: 1,
                date: '2026-01-15T12:00:00.000Z',
                down: 123.4,
                up: 45.6,
                ping: 12,
                grade: 'A+',
            },
        ]));

        render(<SpeedtestPanel isOpen onClose={vi.fn()} />);

        expect(screen.getByText('Speedtest Ultra')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Close speed test' })).toBeTruthy();
        expect(screen.getByText('123.4')).toBeTruthy();
        expect(screen.getByText('45.6')).toBeTruthy();
        expect(screen.getByText('A+')).toBeTruthy();
    });

    it('reloads history when the panel is opened again', () => {
        const view = render(<SpeedtestPanel isOpen={false} onClose={vi.fn()} />);
        localStorage.setItem('speedtest_v8', JSON.stringify([
            {
                id: 2,
                date: '2026-02-01T12:00:00.000Z',
                down: 88,
                up: 20,
                ping: 18,
                grade: 'A',
            },
        ]));

        view.rerender(<SpeedtestPanel isOpen onClose={vi.fn()} />);

        expect(screen.getByText('88')).toBeTruthy();
        expect(screen.getByText('A')).toBeTruthy();
    });
});
