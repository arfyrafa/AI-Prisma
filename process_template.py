import pandas as pd
import json
from datetime import datetime, timedelta, timezone

excel_path = r'c:\MyFiles\MyProject\prisma-ai\PRISMA_AI_Data_Input_Template.xlsx'
df_raw = pd.read_excel(excel_path, sheet_name=0, header=None)
headers = df_raw.iloc[3].tolist()
df = df_raw.iloc[4:].copy()
df.columns = headers

df = df[df['naclo3_feed_m3h'].notna()].copy()

def to_float(val):
    if pd.isna(val) or val == '':
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace('"', '').replace("'", '').strip()
    s = s.replace(',', '.')
    try:
        return float(s)
    except:
        return None

now = datetime.now(timezone.utc)
total_rows = len(df)
records = []

for idx, (_, row) in enumerate(df.iterrows()):
    # 8 hours per shift
    hours_ago = (total_rows - 1 - idx) * 8
    ts = now - timedelta(hours=hours_ago)
    
    rec = {
        'timestamp': ts.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'clo2_concentration': to_float(row['actual_clo2_gpl']),
        'flow_rate': to_float(row['naclo3_feed_m3h']),
        'reaction_efficiency': to_float(row['naclo3_concentration_gpl']),
        'orp': to_float(row['nacl_concentration_gpl']),
        'so2_dosage': to_float(row['hcl_feed_m3h']),
        'ph': to_float(row['hcl_concentration_pct']),
        'pressure': to_float(row['generator_temperature_c']),
        'temperature': to_float(row['absorber_water_temperature_c']),
        'production_capacity': to_float(row['absorber_water_rate_m3h']),
        'source': 'actual_plant'
    }
    records.append(rec)

print(f'Processed {len(records)} records.')
print('First record:', records[0])
print('Last record:', records[-1])

# Save to real_data.py
with open(r'c:\MyFiles\MyProject\prisma-ai\backend\app\db\real_data.py', 'w', encoding='utf-8') as f:
    f.write('# 297 Real plant records from PRISMA_AI_Data_Input_Template.xlsx\n')
    f.write('REAL_PLANT_READINGS = ' + json.dumps(records, indent=2) + '\n')

print('Saved to backend/app/db/real_data.py')

# Also write CSV templates
csv_rows = []
for r in records:
    csv_rows.append({
        'timestamp': r['timestamp'],
        'naclo3_feed_m3h': r['flow_rate'],
        'naclo3_concentration_gpl': r['reaction_efficiency'],
        'nacl_concentration_gpl': r['orp'],
        'hcl_feed_m3h': r['so2_dosage'],
        'hcl_concentration_pct': r['ph'],
        'generator_temperature_c': r['pressure'],
        'absorber_water_temperature_c': r['temperature'],
        'absorber_water_rate_m3h': r['production_capacity'],
        'actual_clo2_gpl': r['clo2_concentration'],
        'operator_notes': 'Data Input Template'
    })
pd.DataFrame(csv_rows).to_csv(r'c:\MyFiles\MyProject\prisma-ai\frontend\public\PRISMA_AI_Real_Plant_Logsheet.csv', index=False)
pd.DataFrame(csv_rows).to_csv(r'c:\MyFiles\MyProject\prisma-ai\frontend\public\PRISMA_AI_Process_Data_Template.csv', index=False)
print('Saved public CSV templates in frontend/public/')
