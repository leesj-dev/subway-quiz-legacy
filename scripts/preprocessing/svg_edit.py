from lxml import etree
from station_line import lines

tree = etree.parse("seoul_KORAIL_pre.svg")
text_elements = tree.xpath("//*[name()='text']")
for text_element in text_elements:
    if "station" == text_element.attrib["class"]:
        try:  # check if id exists
            text_element.attrib["id"]
        except:  # set id same as innerText
            text_element.attrib["id"] = text_element.text
        
        if text_element.attrib["id"] == "신촌_경의·중앙선":
            idx = "신촌(경)"
        elif text_element.attrib["id"] == "신촌_2호선":
            idx = "신촌(2)"
        elif text_element.attrib["id"] == "양평_5호선":
            idx = "양평(5)"
        elif text_element.attrib["id"] == "양평_경의·중앙선":
            idx = "양평(중)"
        else:
            idx = text_element.attrib["id"]

        # remove whitespaces and join every line + one space -> add to class
        line_str = ""
        for x in lines[idx]:
            x = x.replace(" ", "")
            x = x.replace("김포 도시철도", "김포골드라인")
            x = x.replace("용인경전철", "에버라인")
            x = " " + x
            line_str += x
            
        text_element.attrib["class"] += line_str
        text_element.attrib["visibility"] = "hidden"

tree.write("seoul_KORAIL.svg", encoding="UTF-8")
