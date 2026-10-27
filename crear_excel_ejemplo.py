import pandas as pd
import os
import sys

# Asegurar codificación utf-8 para la consola de Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def crear_excel():
    archivo = "clientes_f29.xlsx"
    cols = ["Nombre_Grupo", "Enviar", "Estado_Envio", "Fecha_Envio"]
    df = pd.DataFrame(columns=cols)
    df.to_excel(archivo, index=False)
    print(f"Archivo plantilla '{archivo}' listo y limpio (sin datos dummy).")

if __name__ == "__main__":
    crear_excel()
