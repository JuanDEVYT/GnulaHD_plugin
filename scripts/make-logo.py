import zlib, struct, base64

width = 500
height = 150

# Crearemos una imagen limpia con:
# Background: surface #11151D (17, 21, 29)
# Ícono a la izquierda: Círculo naranja #FF7A18 (255, 122, 24) con triángulo blanco Play en el centro
# A la derecha: texto "GNULA" en naranja y "HD" en blanco
# Usaremos una matriz de píxeles

canvas = [[(17, 21, 29, 255) for _ in range(width)] for _ in range(height)]

def set_pixel(x, y, color):
    if 0 <= x < width and 0 <= y < height:
        canvas[y][x] = color

# Dibujar círculo de acento en x=80, y=75, r=36
cx, cy, r = 80, 75, 36
for y in range(height):
    for x in range(width):
        d2 = (x - cx)**2 + (y - cy)**2
        if d2 <= r**2:
            # Orange play button background
            canvas[y][x] = (255, 122, 24, 255)
        elif d2 <= (r + 1)**2:
            # Anti-aliasing border
            canvas[y][x] = (255, 122, 24, 180)

# Dibujar triángulo play dentro del círculo (vértices: (70, 57), (70, 93), (98, 75))
def point_in_triangle(px, py, x1, y1, x2, y2, x3, y3):
    d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
    d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3)
    d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)

for y in range(cy - 20, cy + 21):
    for x in range(cx - 15, cx + 25):
        if point_in_triangle(x, y, 71, 58, 71, 92, 96, 75):
            canvas[y][x] = (17, 21, 29, 255)

# Render bitmap font for "GNULA HD"
# Letras sencillas y elegantes en bloques gruesos modernos
# Altura de texto: ~44 px (de y=53 a y=97)
FONT = {
    'G': [
        "#####",
        "#    ",
        "# ###",
        "#   #",
        "#####"
    ],
    'N': [
        "#   #",
        "##  #",
        "# # #",
        "#  ##",
        "#   #"
    ],
    'U': [
        "#   #",
        "#   #",
        "#   #",
        "#   #",
        "#####"
    ],
    'L': [
        "#    ",
        "#    ",
        "#    ",
        "#    ",
        "#####"
    ],
    'A': [
        "#####",
        "#   #",
        "#####",
        "#   #",
        "#   #"
    ],
    'H': [
        "#   #",
        "#   #",
        "#####",
        "#   #",
        "#   #"
    ],
    'D': [
        "#### ",
        "#   #",
        "#   #",
        "#   #",
        "#### "
    ]
}

def draw_letter(char, start_x, start_y, scale_w, scale_h, color):
    pattern = FONT.get(char)
    if not pattern: return start_x + 10
    rows = len(pattern)
    cols = len(pattern[0])
    for r in range(rows):
        for c in range(cols):
            if pattern[r][c] == '#':
                for py in range(scale_h):
                    for px in range(scale_w):
                        set_pixel(start_x + c * scale_w + px, start_y + r * scale_h + py, color)
    return start_x + cols * scale_w + scale_w * 2

start_x = 140
start_y = 55
scale_w = 6
scale_h = 8
orange = (255, 122, 24, 255)
white = (255, 255, 255, 255)

for char in "GNULA":
    start_x = draw_letter(char, start_x, start_y, scale_w, scale_h, orange)

start_x += 16 # espacio

for char in "HD":
    start_x = draw_letter(char, start_x, start_y, scale_w, scale_h, white)

# Construir PNG binario
raw = bytearray()
for y in range(height):
    raw.append(0)
    for x in range(width):
        r, g, b, a = canvas[y][x]
        raw.extend([r, g, b, a])

compressor = zlib.compressobj(level=9)
compressed = compressor.compress(raw) + compressor.flush()

def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

png = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', compressed)
png += chunk(b'IEND', b'')

with open("logo.png", "wb") as f:
    f.write(png)

b64 = base64.b64encode(png).decode('ascii')
with open("src/browse/logo.js", "w") as f:
    f.write(f'''// GnulaHD logo (logo.png) para la barra de la pantalla declarativa
export const LOGO_ASPECT = "3.33:1";
export const LOGO_DATA = "data:image/png;base64,{b64}";
''')

print("Logo generado con éxito. Tamaño:", len(png), "bytes.")
