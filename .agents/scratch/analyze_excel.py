import pandas as pd
import json

file_path = r"d:\VS CODE\ร้าน\Google Sheet\ระบบบัญชีร้านส้มตำ น้ำปั่น V.3\ระบบบัญชีร้านส้มตำซูวี_น้ำปั่น_V3.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    result = {}
    for sheet in xl.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
        result[sheet] = list(df.columns)
    
    print(json.dumps(result, ensure_ascii=False, indent=2))
except Exception as e:
    print(f"Error: {e}")
