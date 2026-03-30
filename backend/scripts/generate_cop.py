#!/usr/bin/env python3
"""
Generador COP (Costo Operativo Pacientes) para CDIEM - Centro Oncológico
Genera archivo Excel (.xlsx) con 54 hojas: Resumen, Descripcion, Hora sillon,
Prevision y fichas 1-50 (una por paciente, el resto vacías).

Uso: python3 generate_cop.py <input.json> <output.xlsx>
"""

import sys
import json
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ── Paleta de colores ─────────────────────────────────────────────────────────
BLUE_DARK   = "1F4E79"
BLUE_MID    = "2E4057"
BLUE_LIGHT  = "BDD7EE"
GREEN_DARK  = "1E5631"
GREEN_LIGHT = "C6EFCE"
ORANGE_DARK = "9C5700"
ORANGE_LIGHT = "FFEB9C"
SLATE       = "455A64"
SLATE_LIGHT = "546E7A"
GRAY_ROW    = "F2F2F2"
WHITE       = "FFFFFF"

# ── Helpers de estilo ─────────────────────────────────────────────────────────
def _fill(hex_color):
    return PatternFill(start_color=hex_color, end_color=hex_color, fill_type="solid")

# Objetos de estilo cacheados a nivel de módulo (evitan realocar por celda)
_THIN_SIDE   = Side(style="thin", color="BFBFBF")
THIN_BORDER  = Border(left=_THIN_SIDE, right=_THIN_SIDE, top=_THIN_SIDE, bottom=_THIN_SIDE)
FILL_WHITE   = _fill(WHITE)
FILL_GRAY    = _fill(GRAY_ROW)

# Anchos de columna compartidos entre ficha con paciente y ficha vacía
FICHA_COL_WIDTHS = [30, 12, 10, 14, 14, 14]

def _font(bold=False, color="000000", size=10, italic=False):
    return Font(bold=bold, color=color, size=size, italic=italic)

def _align(h="center", v="center", wrap=False):
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)

def set_col_width(ws, col_idx, width):
    ws.column_dimensions[get_column_letter(col_idx)].width = width

# ── Escritura de filas ────────────────────────────────────────────────────────
def write_title(ws, row, text, hex_bg, font_color="FFFFFF", size=12, end_col=6):
    cell = ws.cell(row=row, column=1, value=text)
    cell.font = _font(bold=True, color=font_color, size=size)
    cell.fill = _fill(hex_bg)
    cell.alignment = _align(h="center", v="center")
    ws.row_dimensions[row].height = 26
    if end_col > 1:
        ws.merge_cells(
            start_row=row, start_column=1,
            end_row=row, end_column=end_col
        )

def write_header_row(ws, row, headers, hex_bg, font_color="FFFFFF", row_height=18):
    ws.row_dimensions[row].height = row_height
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col, value=h)
        cell.font = _font(bold=True, color=font_color, size=9)
        cell.fill = _fill(hex_bg)
        cell.alignment = _align(h="center", wrap=True)
        cell.border = THIN_BORDER

def write_data_row(ws, row, values, alt=False, number_cols=None):
    fill = FILL_GRAY if alt else FILL_WHITE
    number_cols = number_cols or []
    ws.row_dimensions[row].height = 15
    for col, v in enumerate(values, 1):
        cell = ws.cell(row=row, column=col, value=v)
        cell.fill = fill
        cell.alignment = _align(h="right" if col in number_cols else "center", wrap=True)
        cell.border = THIN_BORDER
        if col in number_cols and isinstance(v, (int, float)):
            cell.number_format = '#,##0'

# ── Función auxiliar ──────────────────────────────────────────────────────────
def sec_to_hms(seconds):
    if seconds is None:
        return "00:00:00"
    s = int(seconds)
    return f"{s // 3600:02d}:{(s % 3600) // 60:02d}:{s % 60:02d}"

def mes_nombre(n):
    names = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
             "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    return names[n] if 1 <= n <= 12 else str(n)

def short_datetime(iso):
    """2026-03-15T10:30:00.000Z → ('2026-03-15', '10:30')"""
    if not iso:
        return "", ""
    date_part = iso[:10]
    time_part = iso[11:16] if len(iso) > 10 else ""
    return date_part, time_part

# ── Hojas ─────────────────────────────────────────────────────────────────────
def build_resumen(ws, data, mes, año):
    ws.sheet_view.showGridLines = False

    write_title(ws, 1, f"RESUMEN COP — {mes_nombre(mes).upper()} {año}", BLUE_DARK)
    ws.cell(row=2, column=1, value=f"Centro Oncológico CDIEM  |  Generado: {mes_nombre(mes)} {año}")
    ws.cell(row=2, column=1).font = _font(italic=True, color="666666", size=9)
    ws.merge_cells("A2:F2")
    ws.cell(row=2, column=1).alignment = _align(h="center")

    # Métricas globales
    row = 4
    write_header_row(ws, row, ["INDICADOR", "VALOR"], BLUE_MID)
    metrics = [
        ("Total Pacientes Atendidos",       data["resumen"]["totalPacientes"]),
        ("Total Sesiones Realizadas",        data["resumen"]["totalSesiones"]),
        ("Costo Total Medicamentos (CLP)",   data["resumen"]["costoTotal"]),
    ]
    for i, (label, val) in enumerate(metrics):
        r = row + 1 + i
        ws.row_dimensions[r].height = 15
        label_cell = ws.cell(row=r, column=1, value=label)
        label_cell.fill = (FILL_GRAY if i % 2 == 0 else FILL_WHITE)
        label_cell.alignment = _align(h="left")
        label_cell.border = THIN_BORDER
        val_cell = ws.cell(row=r, column=2, value=val)
        val_cell.fill = (FILL_GRAY if i % 2 == 0 else FILL_WHITE)
        val_cell.alignment = _align(h="right")
        val_cell.border = THIN_BORDER
        if isinstance(val, (int, float)):
            val_cell.number_format = '#,##0'

    # Detalle por paciente
    row = 9
    ws.cell(row=row, column=1, value="DETALLE POR PACIENTE").font = _font(bold=True, color=BLUE_DARK, size=10)
    ws.merge_cells(f"A{row}:F{row}")
    row += 1
    write_header_row(ws, row, ["N°", "Paciente", "RUT / Pasaporte", "Previsión", "Sesiones", "Total CLP"], BLUE_DARK)
    row += 1

    total_general = 0
    for i, p in enumerate(data["pacientes"]):
        write_data_row(ws, row, [
            i + 1,
            p["nombreCompleto"],
            p.get("rut") or p.get("pasaporte") or "",
            p.get("prevision") or "No indicada",
            len(p["sesiones"]),
            p["totalPaciente"]
        ], alt=(i % 2 == 0), number_cols=[6])
        ws.cell(row=row, column=2).alignment = _align(h="left")
        total_general += p["totalPaciente"]
        row += 1

    # Total
    ws.row_dimensions[row].height = 16
    ws.cell(row=row, column=4, value="TOTAL").font = _font(bold=True)
    ws.cell(row=row, column=5, value=len(data["pacientes"])).font = _font(bold=True)
    total_c = ws.cell(row=row, column=6, value=total_general)
    total_c.font = _font(bold=True, color=BLUE_DARK)
    total_c.number_format = '#,##0'
    total_c.fill = _fill(BLUE_LIGHT)
    total_c.alignment = _align(h="right")

    for col, w in enumerate([5, 32, 20, 18, 12, 18], 1):
        set_col_width(ws, col, w)


def build_descripcion(ws, data, mes, año):
    ws.sheet_view.showGridLines = False
    write_title(ws, 1, f"DESCRIPCIÓN DE MEDICAMENTOS — {mes_nombre(mes).upper()} {año}", GREEN_DARK)

    row = 3
    write_header_row(ws, row, ["N°", "Medicamento", "Cant. Total", "Unidad", "Costo Total (CLP)"], GREEN_DARK)
    row += 1

    costo_total = 0
    for i, m in enumerate(data["medicamentos"]):
        write_data_row(ws, row, [
            i + 1,
            m["nombre"],
            m["cantidadTotal"],
            m.get("unidad") or "unidad",
            m["costoTotal"]
        ], alt=(i % 2 == 0), number_cols=[3, 5])
        ws.cell(row=row, column=2).alignment = _align(h="left")
        costo_total += m["costoTotal"]
        row += 1

    ws.row_dimensions[row].height = 16
    ws.cell(row=row, column=4, value="TOTAL").font = _font(bold=True)
    total_c = ws.cell(row=row, column=5, value=costo_total)
    total_c.font = _font(bold=True, color=GREEN_DARK)
    total_c.number_format = '#,##0'
    total_c.fill = _fill(GREEN_LIGHT)
    total_c.alignment = _align(h="right")

    for col, w in enumerate([5, 36, 14, 12, 20], 1):
        set_col_width(ws, col, w)


def build_hora_sillon(ws, data, mes, año):
    ws.sheet_view.showGridLines = False
    write_title(ws, 1, f"USO DE SILLONES — {mes_nombre(mes).upper()} {año}", SLATE)

    row = 3
    write_header_row(ws, row, ["Sillón", "Paciente", "Fecha", "Hora Inicio", "Hora Fin", "Duración (HH:MM:SS)"], SLATE)
    row += 1

    all_sessions = ((p, s) for p in data["pacientes"] for s in p["sesiones"])
    for idx, (p, s) in enumerate(all_sessions):
        d_ini, h_ini = short_datetime(s.get("horaInicio", ""))
        _, h_fin = short_datetime(s.get("horaFin", ""))
        write_data_row(ws, row, [
            s.get("sillon", ""),
            p["nombreCompleto"],
            d_ini,
            h_ini,
            h_fin,
            sec_to_hms(s.get("duracionSegundos"))
        ], alt=(idx % 2 == 0))
        ws.cell(row=row, column=2).alignment = _align(h="left")
        row += 1

    if not data["pacientes"]:
        ws.cell(row=row, column=1, value="Sin sesiones registradas en este período").font = _font(italic=True, color="999999")
        row += 1

    # Resumen por sillón
    row += 1
    ws.cell(row=row, column=1, value="RESUMEN POR SILLÓN").font = _font(bold=True, color=SLATE, size=10)
    ws.merge_cells(f"A{row}:F{row}")
    row += 1
    write_header_row(ws, row, ["Sillón", "Ubicación", "Total Sesiones", "Tiempo Total (HH:MM:SS)", "", ""], SLATE_LIGHT)
    row += 1
    for i, s in enumerate(data["sillones"]):
        write_data_row(ws, row, [
            s["nombre"],
            s.get("ubicacion") or "",
            s["totalSesiones"],
            sec_to_hms(s["segundosTotales"]),
            "", ""
        ], alt=(i % 2 == 0), number_cols=[3])
        ws.cell(row=row, column=1).alignment = _align(h="left")
        row += 1

    for col, w in enumerate([14, 26, 12, 12, 12, 22], 1):
        set_col_width(ws, col, w)


def build_prevision(ws, data, mes, año):
    ws.sheet_view.showGridLines = False
    write_title(ws, 1, f"RESUMEN POR PREVISIÓN — {mes_nombre(mes).upper()} {año}", ORANGE_DARK, end_col=4)

    # Agrupar por previsión
    prev_map = {}
    for p in data["pacientes"]:
        key = p.get("prevision") or "Sin previsión"
        if key not in prev_map:
            prev_map[key] = {"pacientes": 0, "sesiones": 0, "total": 0}
        prev_map[key]["pacientes"] += 1
        prev_map[key]["sesiones"] += len(p["sesiones"])
        prev_map[key]["total"] += p["totalPaciente"]

    row = 3
    write_header_row(ws, row, ["Previsión", "Pacientes", "Sesiones", "Total (CLP)"], ORANGE_DARK)
    row += 1

    gran_total = 0
    for i, (prev, vals) in enumerate(sorted(prev_map.items())):
        write_data_row(ws, row, [
            prev,
            vals["pacientes"],
            vals["sesiones"],
            vals["total"]
        ], alt=(i % 2 == 0), number_cols=[2, 3, 4])
        ws.cell(row=row, column=1).alignment = _align(h="left")
        gran_total += vals["total"]
        row += 1

    if not prev_map:
        ws.cell(row=row, column=1, value="Sin datos en este período").font = _font(italic=True, color="999999")
        row += 1

    ws.row_dimensions[row].height = 16
    ws.cell(row=row, column=3, value="TOTAL").font = _font(bold=True)
    total_c = ws.cell(row=row, column=4, value=gran_total)
    total_c.font = _font(bold=True, color=ORANGE_DARK)
    total_c.number_format = '#,##0'
    total_c.fill = _fill(ORANGE_LIGHT)
    total_c.alignment = _align(h="right")

    for col, w in enumerate([28, 14, 14, 20], 1):
        set_col_width(ws, col, w)


def build_ficha(ws, paciente, ficha_num, mes, año):
    """Ficha individual de paciente con todas sus sesiones del período."""
    ws.sheet_view.showGridLines = False

    write_title(ws, 1, f"FICHA N° {ficha_num} — {paciente['nombreCompleto'].upper()}", BLUE_DARK)
    write_title(ws, 2, f"{mes_nombre(mes)} {año}  |  Centro Oncológico CDIEM", BLUE_MID, font_color="DDDDDD", size=9)

    # Datos del paciente
    row = 4
    ws.cell(row=row, column=1, value="DATOS DEL PACIENTE").font = _font(bold=True, color=BLUE_DARK, size=9)
    ws.merge_cells(f"A{row}:F{row}")
    row += 1

    datos = [
        ("RUT / Pasaporte", paciente.get("rut") or paciente.get("pasaporte") or "N/A"),
        ("Previsión",       paciente.get("prevision") or "No indicada"),
        ("Teléfono",        paciente.get("telefono") or ""),
        ("Correo",          paciente.get("correo") or ""),
    ]
    for label, val in datos:
        ws.row_dimensions[row].height = 14
        lc = ws.cell(row=row, column=1, value=label)
        lc.font = _font(bold=True, size=9)
        lc.fill = _fill(BLUE_LIGHT)
        lc.border = THIN_BORDER
        lc.alignment = _align(h="right")
        vc = ws.cell(row=row, column=2, value=val)
        vc.font = _font(size=9)
        vc.alignment = _align(h="left")
        vc.border = THIN_BORDER
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=6)
        row += 1

    # Sesiones
    row += 1
    ws.cell(row=row, column=1, value="SESIONES DEL PERÍODO").font = _font(bold=True, color=BLUE_DARK, size=9)
    ws.merge_cells(f"A{row}:F{row}")
    row += 1

    total_paciente = 0
    for idx, sesion in enumerate(paciente.get("sesiones", [])):
        # Sub-header de la sesión
        d_ini, h_ini = short_datetime(sesion.get("horaInicio", ""))
        _, h_fin = short_datetime(sesion.get("horaFin", ""))
        ses_label = f"Sesión #{idx+1}  •  {sesion.get('sillon','?')}  •  {d_ini} {h_ini}–{h_fin}"
        write_title(ws, row, ses_label, SLATE_LIGHT, font_color="FFFFFF", size=9)
        row += 1

        write_header_row(ws, row, ["Medicamento", "Cantidad", "Unidad", "Precio Unit.", "Subtotal", ""], SLATE)
        row += 1

        meds = sesion.get("medicamentos", [])
        for j, m in enumerate(meds):
            write_data_row(ws, row, [
                m["nombre"],
                m["cantidad"],
                m.get("unidad", ""),
                m["precioUnitario"],
                m["subtotal"],
                ""
            ], alt=(j % 2 == 0), number_cols=[4, 5])
            ws.cell(row=row, column=1).alignment = _align(h="left")
            row += 1

        if not meds:
            ws.cell(row=row, column=1, value="Sin medicamentos administrados").font = _font(italic=True, color="999999", size=9)
            ws.merge_cells(f"A{row}:F{row}")
            row += 1

        total_ses = sesion.get("totalSesion", 0)
        total_paciente += total_ses
        dur = sec_to_hms(sesion.get("duracionSegundos"))

        ws.row_dimensions[row].height = 14
        dur_c = ws.cell(row=row, column=3, value=f"Duración: {dur}")
        dur_c.font = _font(italic=True, size=8, color="666666")
        ws.merge_cells(f"C{row}:D{row}")
        ws.cell(row=row, column=5, value="Total sesión").font = _font(bold=True, size=9)
        tc = ws.cell(row=row, column=6, value=total_ses)
        tc.font = _font(bold=True)
        tc.number_format = '#,##0'
        tc.alignment = _align(h="right")
        row += 2

    # Total paciente
    ws.row_dimensions[row].height = 18
    lbl = ws.cell(row=row, column=4, value="TOTAL PACIENTE")
    lbl.font = _font(bold=True, color=BLUE_DARK, size=10)
    lbl.fill = _fill(BLUE_LIGHT)
    lbl.alignment = _align(h="right")
    ws.merge_cells(f"D{row}:E{row}")
    grand = ws.cell(row=row, column=6, value=total_paciente)
    grand.font = _font(bold=True, color=BLUE_DARK, size=10)
    grand.fill = _fill(BLUE_LIGHT)
    grand.number_format = '#,##0'
    grand.alignment = _align(h="right")

    for col, w in enumerate(FICHA_COL_WIDTHS, 1):
        set_col_width(ws, col, w)


def build_ficha_vacia(ws, ficha_num):
    """Ficha vacía (sin paciente asignado)."""
    ws.sheet_view.showGridLines = False
    write_title(ws, 1, f"FICHA N° {ficha_num} — (Sin paciente asignado)", "9E9E9E", font_color="EEEEEE")
    ws.cell(row=3, column=1, value="Esta ficha no tiene paciente asignado para el período seleccionado.")
    ws.cell(row=3, column=1).font = _font(italic=True, color="AAAAAA", size=9)
    ws.merge_cells("A3:F3")
    for col, w in enumerate(FICHA_COL_WIDTHS, 1):
        set_col_width(ws, col, w)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 3:
        print("Uso: python3 generate_cop.py <input.json> <output.xlsx>", file=sys.stderr)
        sys.exit(1)

    input_file  = sys.argv[1]
    output_file = sys.argv[2]

    with open(input_file, "r", encoding="utf-8") as f:
        payload = json.load(f)

    data = payload["data"]
    mes  = int(payload["mes"])
    año  = int(payload["año"])

    wb = Workbook()
    wb.remove(wb.active)    # eliminar hoja por defecto

    # ── 4 hojas fijas ──
    ws_res  = wb.create_sheet("Resumen")
    build_resumen(ws_res, data, mes, año)

    ws_desc = wb.create_sheet("Descripcion")
    build_descripcion(ws_desc, data, mes, año)

    ws_hora = wb.create_sheet("Hora sillon")
    build_hora_sillon(ws_hora, data, mes, año)

    ws_prev = wb.create_sheet("Prevision")
    build_prevision(ws_prev, data, mes, año)

    # ── 50 fichas individuales (sheets 1–50) ──
    pacientes = data["pacientes"]
    for i in range(50):
        ws_ficha = wb.create_sheet(str(i + 1))
        if i < len(pacientes):
            build_ficha(ws_ficha, pacientes[i], i + 1, mes, año)
        else:
            build_ficha_vacia(ws_ficha, i + 1)

    wb.save(output_file)
    print(f"OK:{output_file}", flush=True)


if __name__ == "__main__":
    main()
