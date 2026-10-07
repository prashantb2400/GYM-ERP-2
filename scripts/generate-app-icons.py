#!/usr/bin/env python3
import os
import shutil
from PIL import Image, ImageDraw

MASTER_PATH = '/home/prashant/.gemini/antigravity/brain/4543fb61-cb94-4fde-bd92-4539b94b01b5/gymerp_master_icon_1791344610975.jpg'
ROOT_DIR = '/home/prashant/.gemini/antigravity/scratch/GYM-ERP-2'

def make_round_icon(image, size):
    # Resize master image
    img = image.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    
    # Create circular antialiased mask
    scale = 4
    mask = Image.new("L", (size * scale, size * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    mask = mask.resize((size, size), Image.Resampling.LANCZOS)
    
    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(img, (0, 0), mask=mask)
    return output

def make_adaptive_foreground(image, fg_size):
    # Android adaptive foreground is typically 108x108 with 72x72 safe zone (~66.7%)
    # Center the emblem within the foreground canvas
    safe_size = int(fg_size * 0.72)
    resized_icon = image.resize((safe_size, safe_size), Image.Resampling.LANCZOS).convert("RGBA")
    
    fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    offset = (fg_size - safe_size) // 2
    fg_canvas.paste(resized_icon, (offset, offset))
    return fg_canvas

def make_splash_screen(image, width, height):
    # Splash background: exact sample matching master icon corners
    bg_color = (17, 18, 22, 255)
    splash = Image.new("RGBA", (width, height), bg_color)
    
    # Size icon relative to smaller dimension
    min_dim = min(width, height)
    icon_size = max(64, int(min_dim * 0.42))
    resized_icon = image.resize((icon_size, icon_size), Image.Resampling.LANCZOS).convert("RGBA")
    
    offset_x = (width - icon_size) // 2
    offset_y = (height - icon_size) // 2
    splash.paste(resized_icon, (offset_x, offset_y))
    return splash

def main():
    print("Loading master icon:", MASTER_PATH)
    master = Image.open(MASTER_PATH).convert("RGBA")
    
    # 1. Update public/ and src/app/ web assets
    print("Updating web assets...")
    master.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(ROOT_DIR, "public/icon-512.png"), "PNG")
    master.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(ROOT_DIR, "public/icon-192.png"), "PNG")
    master.convert("RGB").save(os.path.join(ROOT_DIR, "public/gymerp_app_logo.jpg"), "JPEG", quality=95)
    
    # Generate multi-size favicon.ico
    favicon_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)]
    favicon_imgs = [master.resize(s, Image.Resampling.LANCZOS) for s in favicon_sizes]
    favicon_imgs[0].save(
        os.path.join(ROOT_DIR, "src/app/favicon.ico"),
        format="ICO",
        sizes=favicon_sizes,
        append_images=favicon_imgs[1:]
    )
    
    # 2. Update Android projects (kiosk and manager)
    android_projects = [
        os.path.join(ROOT_DIR, "android-kiosk/android/app/src/main/res"),
        os.path.join(ROOT_DIR, "android-manager/android/app/src/main/res")
    ]
    
    densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432)
    }
    
    splashes = {
        "drawable/splash.png": (480, 320),
        "drawable-port-mdpi/splash.png": (320, 480),
        "drawable-port-hdpi/splash.png": (480, 800),
        "drawable-port-xhdpi/splash.png": (720, 1280),
        "drawable-port-xxhdpi/splash.png": (960, 1600),
        "drawable-port-xxxhdpi/splash.png": (1280, 1920),
        "drawable-land-mdpi/splash.png": (480, 320),
        "drawable-land-hdpi/splash.png": (800, 480),
        "drawable-land-xhdpi/splash.png": (1280, 720),
        "drawable-land-xxhdpi/splash.png": (1600, 960),
        "drawable-land-xxxhdpi/splash.png": (1920, 1280)
    }
    
    for res_dir in android_projects:
        print(f"Updating icons in: {res_dir}")
        # Mipmap icons
        for density, (icon_sz, fg_sz) in densities.items():
            target_dir = os.path.join(res_dir, density)
            os.makedirs(target_dir, exist_ok=True)
            
            # Standard square launcher
            master.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS).save(
                os.path.join(target_dir, "ic_launcher.png"), "PNG"
            )
            
            # Round launcher
            make_round_icon(master, icon_sz).save(
                os.path.join(target_dir, "ic_launcher_round.png"), "PNG"
            )
            
            # Adaptive foreground
            make_adaptive_foreground(master, fg_sz).save(
                os.path.join(target_dir, "ic_launcher_foreground.png"), "PNG"
            )
        
        # Splash screens
        for rel_path, (w, h) in splashes.items():
            out_file = os.path.join(res_dir, rel_path)
            os.makedirs(os.path.dirname(out_file), exist_ok=True)
            make_splash_screen(master, w, h).save(out_file, "PNG")
            
        # Update adaptive background XML to midnight obsidian #111216
        bg_xml_path = os.path.join(res_dir, "values/ic_launcher_background.xml")
        with open(bg_xml_path, "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#111216</color>\n</resources>\n')

    print("[SUCCESS] All Android and Web app icons generated successfully.")

if __name__ == "__main__":
    main()
