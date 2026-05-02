import { debounce } from "../debounce";

jest.useFakeTimers();

describe("debounce", () => {
  it("delays execution by specified ms", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets timer on subsequent calls", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced();
    jest.advanceTimersByTime(200);
    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes latest arguments", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced("first");
    debounced("second");
    debounced("third");
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("cancel prevents execution", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced();
    debounced.cancel();
    jest.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });
});
