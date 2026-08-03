from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# headless mode
options = webdriver.ChromeOptions()
options.add_argument("headless")
options.add_argument("window-size=1920x1080")
options.add_argument("disable-gpu")

# get link
LINK = "https://ko.wikipedia.org/wiki/%EC%88%98%EB%8F%84%EA%B6%8C_%EC%A0%84%EC%B2%A0%EC%97%AD_%EB%AA%A9%EB%A1%9D"
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), chrome_options=options)
driver.get(LINK)

stations = {}
tables = driver.find_elements(By.XPATH, '//*[@id="mw-content-text"]/div[1]/table')
for table in tables:
    i = 2
    while True:
        try:
            rownum = table.find_element(By.XPATH, f".//tbody/tr[{i}]/td[1]").get_attribute("rowspan")
            key = table.find_element(By.XPATH, f".//tbody/tr[{i}]/td[1]/a").text
            val = [table.find_element(By.XPATH, f".//tbody/tr[{i}]/td[4]/a/span").text]
            if rownum:
                lim = i + int(rownum) - 1
                while i < lim:
                    i += 1
                    val.append(table.find_element(By.XPATH, f".//tbody/tr[{i}]/td/a/span").text)
            stations[key] = val
            i += 1
            print(f"'{key}': {val}")

        except:
            break

# write to file
with open("station_line.py", "w") as f:
    f.write("lines = " + str(stations))