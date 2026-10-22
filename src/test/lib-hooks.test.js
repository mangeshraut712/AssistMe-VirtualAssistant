import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAsync, useCountdown, useDebouncedCallback, usePrevious } from '../lib/hooks';

afterEach(() => {
    vi.useRealTimers();
});

describe('usePrevious', () => {
    it('returns undefined until the value changes, then the previous distinct value', () => {
        const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
            initialProps: { value: 'alpha' },
        });

        expect(result.current).toBeUndefined();

        rerender({ value: 'alpha' });
        expect(result.current).toBeUndefined();

        rerender({ value: 'beta' });
        expect(result.current).toBe('alpha');

        rerender({ value: 'beta' });
        expect(result.current).toBe('alpha');
    });
});

describe('useDebouncedCallback', () => {
    it('waits for the delay and calls the latest callback', () => {
        vi.useFakeTimers();
        const first = vi.fn();
        const second = vi.fn();
        const { result, rerender } = renderHook(({ callback }) => useDebouncedCallback(callback, 200), {
            initialProps: { callback: first },
        });

        act(() => {
            result.current('one');
            vi.advanceTimersByTime(199);
        });
        expect(first).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(first).toHaveBeenCalledTimes(1);
        expect(first).toHaveBeenCalledWith('one');

        rerender({ callback: second });
        act(() => {
            result.current('two');
            vi.advanceTimersByTime(200);
        });

        expect(second).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledWith('two');
        expect(first).toHaveBeenCalledTimes(1);
    });
});

describe('useAsync', () => {
    it('starts a pending request immediately and stores the result', async () => {
        const request = vi.fn().mockResolvedValue('ready');
        const { result } = renderHook(() => useAsync(request, true));

        expect(result.current.status).toBe('pending');
        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            await Promise.resolve();
        });

        expect(request).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('success');
        expect(result.current.value).toBe('ready');
        expect(result.current.isLoading).toBe(false);
    });

    it('stays idle until execute is called when immediate is false', async () => {
        const request = vi.fn().mockRejectedValue(new Error('offline'));
        const { result } = renderHook(() => useAsync(request, false));

        expect(result.current.status).toBe('idle');
        expect(request).not.toHaveBeenCalled();

        await act(async () => {
            await expect(result.current.execute()).rejects.toThrow('offline');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error).toBeInstanceOf(Error);
    });
});

describe('useCountdown', () => {
    it('counts down to zero once and then calls onComplete', () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const { result } = renderHook(() => useCountdown(2, onComplete));

        act(() => {
            result.current.start();
        });
        expect(result.current.isRunning).toBe(true);
        expect(result.current.seconds).toBe(2);

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.seconds).toBe(1);
        expect(onComplete).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.seconds).toBe(0);
        expect(result.current.isRunning).toBe(false);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does not complete when the timer is reset before it reaches zero', () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const { result } = renderHook(() => useCountdown(3, onComplete));

        act(() => {
            result.current.start();
        });
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        act(() => {
            result.current.reset();
        });
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.isRunning).toBe(false);
        expect(result.current.seconds).toBe(3);
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('completes immediately when started at zero', () => {
        const onComplete = vi.fn();
        const { result } = renderHook(() => useCountdown(0, onComplete));

        act(() => {
            result.current.start();
        });

        expect(result.current.isRunning).toBe(false);
        expect(result.current.seconds).toBe(0);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});
