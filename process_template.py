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

# Spread 297 records over last 2 weeks ending yesterday
end_time = datetime.now(timezone.utc).replace(hour=23, minute=0, second=0, microsecond=0) - timedelta(days=1)
start_time = end_time - timedelta(days=14)
total_rows = len(df)
interval_seconds = (end_time - start_time).total_seconds() / (total_rows - 1)

records = []
for idx, (_, row) in enumerate(df.iterrows()):
    ts = start_time + timedelta(seconds=interval_seconds * idx)
    
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
print(f'Date range: {records[0]["timestamp"]} to {records[-1]["timestamp"]}')
print(f'Interval: ~{interval_seconds/60:.0f} minutes between readings')
print('First:', records[0])
print('Last:', records[-1])

with open(r'c:\MyFiles\MyProject\prisma-ai\backend\app\db\real_data.py', 'w', encoding='utf-8') as f:
    f.write('# 297 Real plant records from PRISMA_AI_Data_Input_Template.xlsx\n')
    f.write('# Spread over 2 weeks ending yesterday\n')
    f.write('REAL_PLANT_READINGS = ' + json.dumps(records, indent=2) + '\n')

print('Saved to backend/app/db/real_data.py')
