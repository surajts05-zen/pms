import pdfplumber
import sys
import json
import os

def extract_tables_from_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        return {"error": f"File {pdf_path} not found"}
    
    try:
        data = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    # Filter out empty rows or rows with all None
                    cleaned_table = [row for row in table if any(row)]
                    data.append(cleaned_table)
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    files = [
        "BGBNG00233900000104179_2021.pdf",
        "BGBNG00233900000104179_2022.pdf",
        "BGBNG00233900000104179_2023.pdf",
        "BGBNG00233900000104179_2024.pdf",
        "BGBNG00233900000104179_2025.pdf"
    ]
    
    all_data = {}
    for f in files:
        print(f"Extracting {f}...")
        all_data[f] = extract_tables_from_pdf(f)
    
    with open("pf_data_all.json", "w") as f:
        json.dump(all_data, f, indent=2)
    print("Extracted all data to pf_data_all.json")
