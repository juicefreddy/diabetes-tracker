import { NextRequest, NextResponse } from 'next/server'

function xe(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function varRef(name: string): string {
  return `<dict>
          <key>Value</key>
          <dict>
            <key>string</key>
            <string>&#xFFFC;</string>
            <key>attachmentsByRange</key>
            <dict>
              <key>{0, 1}</key>
              <dict>
                <key>Type</key>
                <string>Variable</string>
                <key>VariableName</key>
                <string>${name}</string>
              </dict>
            </dict>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenString</string>
        </dict>`
}

function litText(s: string): string {
  return `<dict>
          <key>Value</key>
          <dict>
            <key>string</key>
            <string>${xe(s)}</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenString</string>
        </dict>`
}

function buildShortcutPlist(token: string, apiBase: string): string {
  const apiUrl = `${apiBase}/api/sync-workout`

  // URL positions calculated on the actual (non-XML-escaped) string
  // Full URL: {apiUrl}?token={token}&type=FFFC&duration_minutes=FFFC&date=FFFC&calories=FFFC
  const seg0 = `${apiUrl}?token=${token}&type=`
  const p1 = seg0.length
  const p2 = p1 + 1 + '&duration_minutes='.length
  const p3 = p2 + 1 + '&date='.length
  const p4 = p3 + 1 + '&calories='.length

  // XML-escaped URL string with &#xFFFC; placeholders
  const urlXml = `${xe(apiUrl)}?token=${xe(token)}&amp;type=&#xFFFC;&amp;duration_minutes=&#xFFFC;&amp;date=&#xFFFC;&amp;calories=&#xFFFC;`

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowClientVersion</key>
  <string>1300.0.0</string>
  <key>WFWorkflowMinimumClientVersion</key>
  <integer>900</integer>
  <key>WFWorkflowHasShortcutInputVariables</key>
  <false/>
  <key>WFWorkflowTypes</key>
  <array/>
  <key>WFWorkflowInputContentItemClasses</key>
  <array/>
  <key>WFWorkflowIcon</key>
  <dict>
    <key>WFWorkflowIconStartColor</key>
    <integer>431817727</integer>
    <key>WFWorkflowIconGlyphNumber</key>
    <integer>59511</integer>
  </dict>
  <key>WFWorkflowActions</key>
  <array>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.choosefromlist</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFChooseFromListActionPrompt</key>
        <string>운동 종류를 선택하세요</string>
        <key>WFChooseFromListActionSelectMultiple</key>
        <false/>
        <key>WFItems</key>
        <array>
          <string>걷기</string>
          <string>스테퍼</string>
          <string>밴드운동</string>
          <string>자전거</string>
          <string>스쿼트</string>
          <string>런지</string>
          <string>푸시업</string>
          <string>플랭크</string>
          <string>기타</string>
        </array>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setvariable</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFVariableName</key>
        <string>exerciseType</string>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.ask</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFAskActionPrompt</key>
        <string>운동 시간 (분)</string>
        <key>WFInputType</key>
        <string>Number</string>
        <key>WFAskActionDefaultAnswerNumber</key>
        <real>30</real>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setvariable</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFVariableName</key>
        <string>durationMin</string>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.ask</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFAskActionPrompt</key>
        <string>칼로리 (kcal, 모르면 0)</string>
        <key>WFInputType</key>
        <string>Number</string>
        <key>WFAskActionDefaultAnswerNumber</key>
        <real>0</real>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setvariable</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFVariableName</key>
        <string>caloriesKcal</string>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.date</string>
      <key>WFWorkflowActionParameters</key>
      <dict/>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.format.date</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFDateFormat</key>
        <string>Custom</string>
        <key>WFDateFormatString</key>
        <string>yyyy-MM-dd</string>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setvariable</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFVariableName</key>
        <string>todayDate</string>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.downloadurl</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFHTTPMethod</key>
        <string>GET</string>
        <key>WFShowWebView</key>
        <false/>
        <key>WFURL</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>string</key>
            <string>${urlXml}</string>
            <key>attachmentsByRange</key>
            <dict>
              <key>{${p1}, 1}</key>
              <dict>
                <key>Type</key>
                <string>Variable</string>
                <key>VariableName</key>
                <string>exerciseType</string>
              </dict>
              <key>{${p2}, 1}</key>
              <dict>
                <key>Type</key>
                <string>Variable</string>
                <key>VariableName</key>
                <string>durationMin</string>
              </dict>
              <key>{${p3}, 1}</key>
              <dict>
                <key>Type</key>
                <string>Variable</string>
                <key>VariableName</key>
                <string>todayDate</string>
              </dict>
              <key>{${p4}, 1}</key>
              <dict>
                <key>Type</key>
                <string>Variable</string>
                <key>VariableName</key>
                <string>caloriesKcal</string>
              </dict>
            </dict>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenString</string>
        </dict>
      </dict>
    </dict>

    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.showresult</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>Text</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>string</key>
            <string>✅ 운동 기록이 저장되었습니다!</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenString</string>
        </dict>
      </dict>
    </dict>

  </array>
</dict>
</plist>`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const appUrl = searchParams.get('url') ?? req.nextUrl.origin

  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다. 프로필에서 토큰을 생성해주세요.' }, { status: 400 })
  }

  const plist = buildShortcutPlist(token, appUrl)

  return new NextResponse(plist, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.shortcut',
      'Content-Disposition': 'inline; filename="workout.shortcut"',
    },
  })
}
