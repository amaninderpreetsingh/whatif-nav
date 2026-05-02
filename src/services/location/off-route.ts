type RouteState = "ON_ROUTE" | "OFF_ROUTE";

const DISTANCE_THRESHOLD_METERS = 50;
const TIME_THRESHOLD_MS = 10_000;

export class OffRouteDetector {
  private state: RouteState = "ON_ROUTE";
  private deviationStartTime: number | null = null;

  getState(): RouteState {
    return this.state;
  }

  update(distanceFromRoute: number, timestamp: number): void {
    if (distanceFromRoute <= DISTANCE_THRESHOLD_METERS) {
      this.state = "ON_ROUTE";
      this.deviationStartTime = null;
      return;
    }

    if (this.deviationStartTime === null) {
      this.deviationStartTime = timestamp;
    }

    const deviationDuration = timestamp - this.deviationStartTime;
    if (deviationDuration >= TIME_THRESHOLD_MS) {
      this.state = "OFF_ROUTE";
    }
  }

  reset(): void {
    this.state = "ON_ROUTE";
    this.deviationStartTime = null;
  }
}
