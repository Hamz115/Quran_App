from playwright.sync_api import sync_playwright
import os

html_path = os.path.abspath("report-mockup-C-printable.html")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge")
    page = browser.new_page()
    page.goto(f"file:///{html_path}")
    page.pdf(path="report-mockup-C-printable.pdf", format="A4", print_background=True)
    browser.close()
    print("PDF created: report-mockup-C-printable.pdf")
