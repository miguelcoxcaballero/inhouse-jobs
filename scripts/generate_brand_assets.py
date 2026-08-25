from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CREAM = "#F5F5F0"
ORANGE = "#E07A3C"


def roof_mark(size: int, transparent: bool = False, inset: float = 0.2) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else CREAM)
    draw = ImageDraw.Draw(image)
    left = int(size * inset)
    right = int(size * (1 - inset))
    bottom = int(size * 0.67)
    top = int(size * 0.33)
    middle = size // 2
    width = max(3, int(size * 0.075))
    points = [(left, bottom), (middle, top), (right, bottom)]
    draw.line(points, fill=ORANGE, width=width, joint="curve")
    radius = width // 2
    for x, y in (points[0], points[-1]):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=ORANGE)
    return image


def save_png(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=True)


def main() -> None:
    save_png(roof_mark(512), ROOT / "public" / "icon.png")
    save_png(roof_mark(1024), ROOT / "assets" / "inhouse-jobs-icon.png")

    res = ROOT / "android" / "app" / "src" / "main" / "res"
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, size in densities.items():
        icon = roof_mark(size)
        save_png(icon, res / f"mipmap-{density}" / "ic_launcher.png")
        save_png(icon, res / f"mipmap-{density}" / "ic_launcher_round.png")
        foreground = roof_mark(round(size * 2.25), transparent=True, inset=0.27)
        save_png(foreground, res / f"mipmap-{density}" / "ic_launcher_foreground.png")

    splash = roof_mark(900, transparent=False, inset=0.31)
    splash_targets = list(res.glob("drawable*/splash.png"))
    for destination in splash_targets:
        save_png(splash, destination)


if __name__ == "__main__":
    main()
