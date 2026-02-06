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
                    data.append(table)
                # Also extract text just in case
                text = page.extract_text()
                if text:
                    data.append({"text_content": text})
        return {"data": data}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_pf.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_tables_from_pdf(pdf_path)
    print(json.dumps(result, indent=2))
