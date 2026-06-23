from __future__ import annotations

from dataclasses import dataclass

from app.schemas.node import NodeMetricPoint


MEMINFO_MARKER = "__NODE_CONTROLLER_MEMINFO__"


@dataclass(slots=True)
class ProcSnapshot:
    total_ticks: int
    idle_ticks: int
    ram_percent: float | None


def parse_proc_snapshot(output: str) -> ProcSnapshot:
    stat_part, meminfo_part = _split_sections(output)
    total_ticks, idle_ticks = _parse_cpu_ticks(stat_part)
    ram_percent = _parse_ram_percent(meminfo_part)
    return ProcSnapshot(total_ticks=total_ticks, idle_ticks=idle_ticks, ram_percent=ram_percent)


def build_metric_point(
    *,
    timestamp,
    current: ProcSnapshot | None,
    previous: ProcSnapshot | None,
) -> NodeMetricPoint:
    if current is None:
        return NodeMetricPoint(timestamp=timestamp, cpu_percent=None, ram_percent=None)

    cpu_percent = _calculate_cpu_percent(previous=previous, current=current)
    return NodeMetricPoint(
        timestamp=timestamp,
        cpu_percent=cpu_percent,
        ram_percent=current.ram_percent,
    )


def _split_sections(output: str) -> tuple[str, str]:
    if MEMINFO_MARKER not in output:
        raise ValueError("Monitoring output does not contain meminfo marker")

    stat_part, meminfo_part = output.split(MEMINFO_MARKER, maxsplit=1)
    return stat_part.strip(), meminfo_part.strip()


def _parse_cpu_ticks(stat_part: str) -> tuple[int, int]:
    for line in stat_part.splitlines():
        if line.startswith("cpu "):
            fields = line.split()[1:]
            if len(fields) < 4:
                break

            values = [int(value) for value in fields]
            total_ticks = sum(values)
            idle_ticks = values[3] + (values[4] if len(values) > 4 else 0)
            return total_ticks, idle_ticks

    raise ValueError("Unable to parse CPU data from /proc/stat")


def _parse_ram_percent(meminfo_part: str) -> float | None:
    values: dict[str, int] = {}
    for line in meminfo_part.splitlines():
        if ":" not in line:
            continue
        key, raw_value = line.split(":", maxsplit=1)
        number = raw_value.strip().split()[0]
        values[key] = int(number)

    total = values.get("MemTotal")
    available = values.get("MemAvailable")
    if not total or available is None:
        return None

    used = max(total - available, 0)
    return round((used / total) * 100, 2)


def _calculate_cpu_percent(
    *,
    previous: ProcSnapshot | None,
    current: ProcSnapshot,
) -> float | None:
    if previous is None:
        return None

    total_delta = current.total_ticks - previous.total_ticks
    idle_delta = current.idle_ticks - previous.idle_ticks
    if total_delta <= 0:
        return None

    busy_ticks = max(total_delta - idle_delta, 0)
    return round((busy_ticks / total_delta) * 100, 2)
