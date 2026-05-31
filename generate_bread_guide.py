#!/usr/bin/env python3
"""쿠킹타이거 빵 영양성분 가이드 - 당뇨 환자용 PDF 생성"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                 Paragraph, Spacer, HRFlowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

# ── 폰트 등록 ────────────────────────────────────────────────
FONT_R = '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'
FONT_B = '/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf'
pdfmetrics.registerFont(TTFont('NG', FONT_R))
pdfmetrics.registerFont(TTFont('NGB', FONT_B))
F, FB = 'NG', 'NGB'

# ── 색상 ─────────────────────────────────────────────────────
C_GREEN   = HexColor('#D5F5E3')
C_YELLOW  = HexColor('#FEF9E7')
C_WHITE   = HexColor('#FFFFFF')
C_GRAY    = HexColor('#EAECEE')
C_HDR     = HexColor('#1B4F72')
C_SUBHDR  = HexColor('#2E86C1')
C_LINE    = HexColor('#AEB6BF')
C_TXT     = HexColor('#1C2833')
C_GRN_TXT = HexColor('#1A5632')
C_YLW_TXT = HexColor('#7D6608')
C_RED_TXT = HexColor('#922B21')
C_SUBGRAY = HexColor('#717D7E')

PAGE_W = A4[0] - 2.4 * cm  # 사용 가능한 너비

# ── 스타일 헬퍼 ──────────────────────────────────────────────
_style_cache = {}

def ps(name, font=F, size=9, color=C_TXT, align='LEFT', leading=None):
    key = (name, font, size, str(color), align)
    if key not in _style_cache:
        _style_cache[key] = ParagraphStyle(
            name + str(id(key)),
            fontName=font,
            fontSize=size,
            textColor=color,
            alignment={'LEFT': 0, 'CENTER': 1, 'RIGHT': 2}[align],
            leading=leading or size * 1.35,
            wordWrap='CJK',
        )
    return _style_cache[key]

def P(text, font=F, size=9, color=C_TXT, align='LEFT', leading=None):
    name = f'{font}_{size}_{str(color)}_{align}'
    return Paragraph(str(text), ps(name, font=font, size=size, color=color, align=align, leading=leading))

def fmt(v):
    """숫자 포맷: 소수점 불필요시 정수로"""
    if v == 0:
        return '0'
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v)

# ── 제품 데이터 ───────────────────────────────────────────────
# (제품명, 기준량, 열량kcal, 탄수화물g, 당류g, 단백질g, 지방g, 포화지방g, 트랜스지방g, 나트륨mg, 색상코드)
# 색상: G=녹색(강력추천), Y=노란색(주의섭취), W=흰색(권장안함)
PRODUCTS = {
    '식빵류': [
        ('통밀빵 식빵',         '100g (2장)',   222, 46,   0,   8,  1.1, 0.0, 0.0, 229, 'Y'),
        ('마법의 쑥식빵',       '100g',         204, 21,   0,  26,  1.4, 0.0, 0.0, 201, 'G'),
        ('마법의 통호밀빵',     '100g',         204, 22,   0,  28,  1.2, 0.0, 0.0, 184, 'G'),
        ('프로틴 식빵',         '100g (1봉)',   258, 38, 1.0,  21,  3.0, 0.0, 0.0, 224, 'G'),
        ('시나몬미니식빵',      '100g',         212, 38,   0,   7,  4.2, 0.0, 0.0, 175, 'Y'),
        ('건과일견과식빵',      '100g (1봉)',   261, 45,   5,   8,  6.0, 0.0, 0.0, 175, 'W'),
        ('치즈무화과식빵',      '100g (1포장)', 244, 44,   5,   8,  4.0, 1.5, 0.0, 295, 'W'),
        ('살구치즈 식빵',       '100g (1봉)',   233, 43,   5,   8,  3.9, 1.5, 0.0, 295, 'W'),
    ],
    '베이글류': [
        ('플레인베이글',        '110g (1봉)',   205, 43,   0,   7,  1.0, 0.0, 0.0, 208, 'Y'),
        ('시나몬베이글',        '110g (1봉)',   205, 43,   0,   7,  1.0, 0.0, 0.0, 208, 'Y'),
        ('치즈베이글',          '150g (1개)',   340, 52,   0,  16,  8.0, 4.2, 0.0, 362, 'W'),
        ('참깨베이글',          '110g (1개)',   282, 52,   0,  10,  4.5, 0.0, 0.0, 212, 'W'),
        ('흑임자베이글',        '110g (1개)',   282, 52,   0,  10,  4.5, 0.0, 0.0, 212, 'W'),
    ],
    '깜빠뉴류': [
        ('플레인깜빠뉴',        '100g',         190, 40,   0,   7,  0.9, 0.0, 0.0, 193, 'Y'),
        ('올리브치즈깜빠뉴',    '100g',         196, 32,   0,   7,  4.7, 1.6, 0.0, 372, 'Y'),
        ('치즈깜빠뉴',          '100g',         221, 32,   0,   8,  7.0, 3.0, 0.0, 390, 'Y'),
        ('견과깜빠뉴',          '100g (1회)',   276, 36, 1.0,  10, 11.0, 0.8, 0.0, 151, 'Y'),
        ('무화과호두깜빠뉴',    '100g',         247, 44,   7,   8,  5.0, 0.0, 0.0, 171, 'W'),
    ],
    '팥빵/단팥빵류': [
        ('설탕무첨가 단팥빵',        '160g (1봉)',  266, 54,   0,  11,  0.8, 0.0, 0.0, 174, 'Y'),
        ('말차 단팥빵',              '160g (1봉)',  266, 54,   0,  11,  0.8, 0.0, 0.0, 174, 'Y'),
        ('뚱앙금팥빵 ★예상',        '약213g (1봉)',350, 68,   0,  15,  1.1, 0.0, 0.0, 190, 'Y'),
        ('크림치즈 팥빵',            '160g (1봉)',  343, 48, 1.0,  12, 12.0, 6.0, 0.3, 271, 'W'),
        ('말차 크림치즈 팥빵',       '160g (1봉)',  343, 48, 1.0,  12, 12.0, 6.0, 0.3, 271, 'W'),
        ('말차 떡빵',                '160g',        266, 54,   4,  11,  0.8, 0.0, 0.0, 174, 'W'),
    ],
    '저탄수 사워도우 / 치아바타': [
        ('저탄수 통호밀 사워도우',   '100g',        218, 25,   0,  24,  1.2, 0.0, 0.0, 200, 'G'),
        ('저탄수 통호밀 치아바타',   '100g',        218, 25,   0,  24,  1.2, 0.0, 0.0, 200, 'G'),
    ],
    '기타': [
        ('프로틴파운드',             '90g (전체)',  217, 25, 1.0,  22,  3.3, 0.0, 0.0, 153, 'G'),
        ('모닝빵',                   '100g',        182, 38,   0,   6,  0.9, 0.0, 0.0, 137, 'Y'),
        ('감자 치아바타',            '160g (1포장)',290, 50, 1.0,   9,  6.0, 3.0, 0.0, 300, 'Y'),
        ('현미팝',                   '20g (1회)',    88, 19,   0,   2,  0.6, 0.0, 0.0,  11, 'Y'),
    ],
}

COL_HEADERS = [
    '제품명', '기준량', '열량\n(kcal)', '탄수화물\n(g)', '당류\n(g)',
    '단백질\n(g)', '지방\n(g)', '포화지방\n(g)', '트랜스\n지방(g)', '나트륨\n(mg)'
]
COL_W = [4.4*cm, 2.5*cm, 1.55*cm, 1.55*cm, 1.4*cm,
         1.4*cm, 1.3*cm, 1.5*cm, 1.5*cm, 1.55*cm]

COLOR_MAP = {'G': C_GREEN, 'Y': C_YELLOW, 'W': C_WHITE}


def make_header_row():
    row = []
    for h in COL_HEADERS:
        row.append(P(h, font=FB, size=8, color=colors.white, align='CENTER'))
    return row


def make_data_row(item):
    name, serving, kcal, carbs, sugar, protein, fat, sat_fat, trans_fat, sodium, c = item

    # 당류 색상
    if sugar == 0:
        sug_col, sug_font = C_GRN_TXT, FB
    elif sugar > 1:
        sug_col, sug_font = C_RED_TXT, FB
    else:
        sug_col, sug_font = C_TXT, F

    # 단백질 색상 (15g 이상 강조)
    prot_col = C_GRN_TXT if protein >= 15 else C_TXT
    prot_font = FB if protein >= 15 else F

    # 트랜스지방 강조
    trans_col = C_RED_TXT if trans_fat > 0 else C_TXT
    trans_font = FB if trans_fat > 0 else F

    # 포화지방 강조 (4g 이상)
    sat_col = C_RED_TXT if sat_fat >= 4 else C_TXT

    name_font = FB if c == 'G' else F
    return [
        P(name,              font=name_font, size=8.5, color=C_TXT,     align='LEFT'),
        P(serving,           font=F,         size=7.5, color=C_SUBGRAY, align='CENTER'),
        P(str(kcal),         font=FB,        size=9,   color=C_TXT,     align='CENTER'),
        P(fmt(carbs),        font=F,         size=9,   color=C_TXT,     align='CENTER'),
        P(fmt(sugar),        font=sug_font,  size=9,   color=sug_col,   align='CENTER'),
        P(fmt(protein),      font=prot_font, size=9,   color=prot_col,  align='CENTER'),
        P(fmt(fat),          font=F,         size=9,   color=C_TXT,     align='CENTER'),
        P(fmt(sat_fat),      font=F,         size=9,   color=sat_col,   align='CENTER'),
        P(fmt(trans_fat),    font=trans_font,size=9,   color=trans_col, align='CENTER'),
        P(str(int(sodium)),  font=F,         size=9,   color=C_TXT,     align='CENTER'),
    ]


def build_category_table(items):
    table_data = [make_header_row()]
    row_styles = [
        ('BACKGROUND',  (0, 0), (-1, 0), C_SUBHDR),
        ('BOX',         (0, 0), (-1, -1), 0.6, C_LINE),
        ('INNERGRID',   (0, 0), (-1, -1), 0.3, C_LINE),
        ('TOPPADDING',  (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',(0,0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING',(0, 0), (-1, -1), 3),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for r_idx, item in enumerate(items, start=1):
        table_data.append(make_data_row(item))
        bg = COLOR_MAP[item[-1]]
        row_styles.append(('BACKGROUND', (0, r_idx), (-1, r_idx), bg))

    t = Table(table_data, colWidths=COL_W, repeatRows=1)
    t.setStyle(TableStyle(row_styles))
    return t


def build_legend():
    entries = [
        (C_GREEN,  C_GRN_TXT, FB, '당뇨 환자에게 적합 (강력 추천)',
         '당류 ≤1g + 단백질 ≥15g  |  고단백·저당 제품으로 혈당 상승 억제에 효과적'),
        (C_YELLOW, C_YLW_TXT, FB, '주의하여 섭취 (소량 권장)',
         '당류 ≤1g, 트랜스지방 0g  |  100% 통밀 기반이나 탄수화물 함량 주의. 채소·단백질과 함께 소량 섭취'),
        (C_WHITE,  C_RED_TXT, FB, '권장하지 않음 (주의 필요)',
         '당류 >1g 또는 트랜스지방 함유 또는 포화지방·탄수화물 과다  |  혈당 급상승 위험'),
    ]
    data = []
    for bg, tc, tf, label, desc in entries:
        data.append([
            P(label, font=tf, size=8.5, color=tc, align='LEFT'),
            P(desc,  font=F,  size=7.5, color=C_TXT, align='LEFT'),
        ])
    t = Table(data, colWidths=[5.2*cm, PAGE_W - 5.2*cm])
    styles = [
        ('BOX',         (0, 0), (-1, -1), 0.6, C_LINE),
        ('INNERGRID',   (0, 0), (-1, -1), 0.3, C_LINE),
        ('TOPPADDING',  (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING',(0,0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for i, (bg, *_) in enumerate(entries):
        styles.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(styles))
    return t


def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=1.2*cm, rightMargin=1.2*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
        title='쿠킹타이거 빵 영양성분 가이드',
        author='당뇨 환자용 영양정보',
    )
    story = []

    # ── 제목 ──────────────────────────────────────────────────
    story.append(P('쿠킹타이거 빵 영양성분 가이드', font=FB, size=20, color=C_HDR, align='CENTER'))
    story.append(Spacer(1, 2*mm))
    story.append(P('당뇨 환자를 위한 선택 가이드  |  우리밀 통밀 함량 100% 제품 전 품목',
                   font=F, size=10, color=C_SUBHDR, align='CENTER'))
    story.append(Spacer(1, 3*mm))
    story.append(HRFlowable(width=PAGE_W, thickness=2, color=C_HDR))
    story.append(Spacer(1, 4*mm))

    # ── 범례 ──────────────────────────────────────────────────
    story.append(P('▌ 색상 범례 및 선택 기준', font=FB, size=10, color=C_HDR, align='LEFT'))
    story.append(Spacer(1, 1.5*mm))
    story.append(build_legend())
    story.append(Spacer(1, 5*mm))

    # ── 카테고리별 표 ─────────────────────────────────────────
    cat_icons = {
        '식빵류':                    '식빵류',
        '베이글류':                  '베이글류',
        '깜빠뉴류':                  '깜빠뉴류',
        '팥빵/단팥빵류':             '팥빵 / 단팥빵류',
        '저탄수 사워도우 / 치아바타': '저탄수 사워도우 / 치아바타  ★ 신규',
        '기타':                      '기타 (치아바타 · 파운드 · 모닝빵 · 현미팝)',
    }

    for cat, items in PRODUCTS.items():
        # 카테고리 헤더
        cat_label = cat_icons.get(cat, cat)
        hdr_data = [[P(f'  {cat_label}', font=FB, size=10.5, color=colors.white, align='LEFT')]]
        hdr_t = Table(hdr_data, colWidths=[PAGE_W])
        hdr_t.setStyle(TableStyle([
            ('BACKGROUND',  (0, 0), (-1, -1), C_HDR),
            ('TOPPADDING',  (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING',(0,0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(hdr_t)
        story.append(build_category_table(items))
        story.append(Spacer(1, 5*mm))

    # ── 요약 추천표 ───────────────────────────────────────────
    story.append(HRFlowable(width=PAGE_W, thickness=1.5, color=C_SUBHDR))
    story.append(Spacer(1, 3*mm))
    story.append(P('▌ 당뇨 환자 강력 추천 제품 요약', font=FB, size=10, color=C_HDR, align='LEFT'))
    story.append(Spacer(1, 2*mm))

    top_items = [
        ('저탄수 통호밀 사워도우/치아바타', '100g',  218, 25, 0, 24, 1.2, '탄수화물 25g·단백질 24g — 저탄수 고단백 최우수'),
        ('마법의 통호밀빵',                 '100g',  204, 22, 0, 28, 1.2, '단백질 28g 최고, 탄수화물 22g 최저'),
        ('마법의 쑥식빵',                   '100g',  204, 21, 0, 26, 1.4, '단백질 26g, 탄수화물 21g 최저'),
        ('프로틴파운드',                    '90g',   217, 25, 1, 22, 3.3, '유청단백질 강화, 낮은 탄수화물'),
        ('프로틴 식빵',                     '100g',  258, 38, 1, 21, 3.0, '단백질 21g, 통밀 100% 식빵'),
    ]
    top_data = [
        [P(h, font=FB, size=8, color=colors.white, align='CENTER') for h in
         ['제품명', '기준량', '열량(kcal)', '탄수화물(g)', '당류(g)', '단백질(g)', '지방(g)', '특징']]
    ]
    for row in top_items:
        name, srv, kcal, carbs, sugar, prot, fat, note = row
        top_data.append([
            P(name,        font=FB, size=8.5, color=C_GRN_TXT, align='LEFT'),
            P(srv,         font=F,  size=7.5, color=C_SUBGRAY, align='CENTER'),
            P(str(kcal),   font=FB, size=9,   color=C_TXT,     align='CENTER'),
            P(str(carbs),  font=F,  size=9,   color=C_TXT,     align='CENTER'),
            P(str(sugar),  font=FB, size=9,   color=C_GRN_TXT, align='CENTER'),
            P(str(prot),   font=FB, size=9,   color=C_GRN_TXT, align='CENTER'),
            P(str(fat),    font=F,  size=9,   color=C_TXT,     align='CENTER'),
            P(note,        font=F,  size=7.5, color=C_TXT,     align='LEFT'),
        ])

    top_widths = [3.5*cm, 1.8*cm, 1.7*cm, 1.7*cm, 1.4*cm, 1.5*cm, 1.3*cm, 5.3*cm]
    top_t = Table(top_data, colWidths=top_widths)
    top_styles = [
        ('BACKGROUND',   (0, 0), (-1, 0), C_GRN_TXT),
        ('BOX',          (0, 0), (-1, -1), 0.6, C_LINE),
        ('INNERGRID',    (0, 0), (-1, -1), 0.3, C_LINE),
        ('TOPPADDING',   (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 3),
        ('LEFTPADDING',  (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for i in range(1, len(top_data)):
        top_styles.append(('BACKGROUND', (0, i), (-1, i), C_GREEN))
    top_t.setStyle(TableStyle(top_styles))
    story.append(top_t)
    story.append(Spacer(1, 5*mm))

    # ── 주의사항 ──────────────────────────────────────────────
    story.append(HRFlowable(width=PAGE_W, thickness=0.8, color=C_LINE))
    story.append(Spacer(1, 2*mm))
    notes = [
        '※ 전 제품 우리밀 통밀(국산) 함량 100% 기준이며, 정제 밀가루 대비 혈당 상승 속도(GI)가 낮습니다.',
        '※ 녹색 제품(저탄수 사워도우/치아바타, 마법의 쑥식빵, 마법의 통호밀빵, 프로틴파운드, 프로틴 식빵)은 고단백·저당 제품으로 혈당 관리에 가장 적합합니다.',
        '※ 저탄수 통호밀 사워도우/치아바타의 당류·포화지방 정보는 미표기로 0g 추정 적용되었습니다.',
        '※ 뚱앙금팥빵(★예상)은 설탕무첨가 단팥빵 대비 팥앙금 2배(+53g) 기준으로 추정한 영양성분입니다. 실제 제품과 다를 수 있으며 탄수화물(68g/213g)이 매우 높으니 절반씩 나눠 드세요.',
        '※ 노란색 제품은 소량씩 채소·달걀 등 단백질 식품과 함께 섭취하면 혈당 상승을 완화할 수 있습니다.',
        '※ 설탕무첨가/말차 단팥빵은 스테비아(천연 감미료) 사용으로 당류 0g이나, 탄수화물(54g/160g)이 높습니다.',
        '※ 크림치즈 팥빵류는 트랜스지방(0.3g) 함유로 당뇨 환자에게 권장하지 않습니다.',
        '※ 개인별 혈당 반응이 다를 수 있으므로 반드시 의료진과 상담 후 섭취하시기 바랍니다.',
        '※ 출처: 쿠킹타이거(프로틴팩토리) 스마트스토어 제품 영양정보  |  작성일: 2026-05-30',
    ]
    for note in notes:
        story.append(P(note, font=F, size=7.5, color=C_SUBGRAY, align='LEFT'))
        story.append(Spacer(1, 0.8*mm))

    doc.build(story)
    print(f'PDF 생성 완료: {output_path}')


if __name__ == '__main__':
    OUTPUT = '/home/user/diabetes-tracker/쿠킹타이거_빵_영양성분_가이드_당뇨환자용.pdf'
    build_pdf(OUTPUT)
