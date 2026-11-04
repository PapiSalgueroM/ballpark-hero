from pathlib import Path
import json, re, hashlib
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
import fitz

ROOT = Path(__file__).parent
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)
data = json.loads((ROOT/"handoff-content.json").read_text(encoding="utf-8"))
for name, filename in [("Body","DejaVuSans.ttf"),("Bold","DejaVuSans-Bold.ttf"),("Mono","DejaVuSansMono.ttf")]:
    pdfmetrics.registerFont(TTFont(name, "/usr/share/fonts/truetype/dejavu/" + filename))
navy = colors.HexColor("#12243A")
green = colors.HexColor("#117B65")
ink = colors.HexColor("#24354A")
muted = colors.HexColor("#617184")
light = colors.HexColor("#F0F5F7")
rule = colors.HexColor("#D9E2E8")
styles = {
 "title": ParagraphStyle("title",fontName="Bold",fontSize=23,leading=28,textColor=navy,spaceAfter=8),
 "sub": ParagraphStyle("sub",fontName="Body",fontSize=9,leading=13,textColor=muted,spaceAfter=18),
 "h": ParagraphStyle("h",fontName="Bold",fontSize=11,leading=15,textColor=navy,spaceBefore=10,spaceAfter=5),
 "p": ParagraphStyle("p",fontName="Body",fontSize=9.1,leading=13.3,textColor=ink,spaceAfter=7),
 "bullet": ParagraphStyle("bullet",fontName="Body",fontSize=8.9,leading=12.6,textColor=ink,leftIndent=11,firstLineIndent=-9,spaceAfter=5),
 "code": ParagraphStyle("code",fontName="Mono",fontSize=7.6,leading=10.8,textColor=navy,spaceAfter=5,wordWrap="CJK"),
 "cell": ParagraphStyle("cell",fontName="Body",fontSize=8.0,leading=11.1,textColor=ink,wordWrap="CJK"),
 "th": ParagraphStyle("th",fontName="Bold",fontSize=8.0,leading=11.1,textColor=colors.white,wordWrap="CJK"),
 "calllabel": ParagraphStyle("calllabel",fontName="Bold",fontSize=10,leading=14,textColor=green,spaceAfter=4),
 "call": ParagraphStyle("call",fontName="Body",fontSize=9.1,leading=13.3,textColor=ink)
}
def markup(text):
    t=escape(text).replace("\n","<br/>")
    # Actual Actions run IDs remain readable and clickable.
    t=re.sub(r"\b(418\d{8})\b",lambda m:'<link href="https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/'+m.group(1)+'" color="#117B65">'+m.group(1)+'</link>',t)
    return t
def para(text, style="p"):
    return Paragraph(markup(text), styles[style])
class NumberedCanvas(canvas.Canvas):
    def __init__(self,*a,**kw):
        super().__init__(*a,**kw)
        self.saved=[]
    def showPage(self):
        self.saved.append(dict(self.__dict__))
        self._startPage()
    def save(self):
        total=len(self.saved)
        for state in self.saved:
            self.__dict__.update(state)
            self.setFillColor(navy)
            self.rect(0,756,612,36,stroke=0,fill=1)
            self.setFillColor(colors.white)
            self.setFont("Bold",8)
            self.drawString(48,769,"DOUKNOWBALL  /  DEVELOPMENT HANDOFF")
            self.setFont("Body",7.5)
            self.drawRightString(564,769,"04 NOV 2026")
            self.setStrokeColor(rule)
            self.line(48,40,564,40)
            self.setFillColor(muted)
            self.setFont("Body",7.4)
            self.drawString(48,27,"Master list in progress  |  Fourth batch live; fifth batch pending")
            self.drawRightString(564,27,f"{self._pageNumber} / {total}")
            super().showPage()
        super().save()
pdf=OUT/"DoUKnowBall_Development_Handoff_2026-11-04.pdf"
doc=SimpleDocTemplate(str(pdf),pagesize=(612,792),leftMargin=48,rightMargin=48,topMargin=54,bottomMargin=52,
 title=data["title"],author="DoUKnowBall development handoff",subject="Published state, fifth-batch candidates, exact evidence and next actions")
story=[]
for number,page in enumerate(data["pages"]):
    if number: story.append(PageBreak())
    story.extend([para(page["title"],"title"),para(page["subtitle"],"sub")])
    for block in page["blocks"]:
        kind=block["type"]
        if kind in ("p","h"):
            story.append(para(block["text"],kind))
        elif kind=="bullets":
            story.extend(para("- "+item,"bullet") for item in block["items"])
        elif kind=="code":
            box=Table([[para(block["text"],"code")]],colWidths=[516])
            box.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),light),("BOX",(0,0),(-1,-1),0.5,rule),
                ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
            story.extend([box,Spacer(1,7)])
        elif kind=="callout":
            box=Table([[para(block["label"],"calllabel")],[para(block["text"],"call")]],colWidths=[516])
            box.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#EAF5F0")),("LINEBEFORE",(0,0),(0,-1),3,green),
                ("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),
                ("TOPPADDING",(0,0),(-1,0),9),("BOTTOMPADDING",(0,-1),(-1,-1),10)]))
            story.extend([box,Spacer(1,8)])
        elif kind=="table":
            rows=[[para(x,"th") for x in block["headers"]]]+[[para(x,"cell") for x in row] for row in block["rows"]]
            widths=[516*x/sum(block["widths"]) for x in block["widths"]]
            tab=Table(rows,colWidths=widths,repeatRows=1,hAlign="LEFT")
            tab.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),navy),("VALIGN",(0,0),(-1,-1),"TOP"),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,light]),
                ("LINEBELOW",(0,0),(-1,0),0.5,navy),("LINEBELOW",(0,1),(-1,-1),0.35,rule),
                ("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),
                ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
            story.extend([tab,Spacer(1,8)])
doc.build(story,canvasmaker=NumberedCanvas)
reader=PdfReader(str(pdf))
assert len(reader.pages)==len(data["pages"]),f"Unexpected overflow: {len(reader.pages)}"
text="\n".join(p.extract_text() for p in reader.pages)
for token in ["63dec52cb0d1becf7a2d8e921114d02987178118","cbe2093a2c1bbbf3e5b866157d18e923b97481b1","41864591130","409","13/15"]:
    assert token in text.replace("\n",""),token
assert "\u2014" not in text and "\u2013" not in text
(OUT/"extracted-text.txt").write_text(text,encoding="utf-8")
renders=OUT/"renders"
renders.mkdir(exist_ok=True)
rendered=fitz.open(str(pdf))
for i,page in enumerate(rendered):
    # Visual layout review is mandatory; these images are deliverable QA only.
    page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False).save(str(renders/f"page-{i+1:02}.png"))
manifest={"pdf":pdf.name,"pages":len(reader.pages),"bytes":pdf.stat().st_size,
 "sha256":hashlib.sha256(pdf.read_bytes()).hexdigest(),"sourcePages":len(data["pages"]),
 "checks":["expected page count","required current pins and evidence present","ASCII dash policy","all pages rendered for visual review"]}
(OUT/"PDF-MANIFEST.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps(manifest))
