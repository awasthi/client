import * as React from 'react'
import * as Kb from '../../common-adapters/index'
import PhoneInput from '../../signup/phone-number/phone-input'
import * as Styles from '../../styles'
import * as RPCTypes from '../../constants/types/rpc-gen'
import * as I from 'immutable'
import {User} from 'constants/types/team-building'

type PhoneSearchProps = {
  onChangeNumber: (phoneNumber: string) => void
  assertionToContactMap: I.Map<string, RPCTypes.ProcessedContact>
  onContinue: (user: User) => void
}

const PhoneSearch = (props: PhoneSearchProps) => {
  const [validity, setValidity] = React.useState<boolean>(false)
  const [phoneNumber, setPhoneNumber] = React.useState<string>('')
  const [phoneInputKey, setPhoneInputKey] = React.useState<number>(0)

  let user = props.assertionToContactMap.get(phoneNumber)

  let _onContinue = () => {
    if (user) {
      props.onContinue({id: user.username, prettyName: user.fullName, serviceMap: {phone: phoneNumber}})
      setPhoneNumber('')
      setPhoneInputKey(old => old + 1)
      setValidity(false)
    }
  }

  return (
    <Kb.ScrollView>
      <Kb.Box2
        direction="vertical"
        gap="tiny"
        style={{backgroundColor: Styles.globalColors.greyLight, marginTop: Styles.globalMargins.tiny}}
      >
        <PhoneInput
          // Supply a key to force reset the PhoneInput state after a user is added
          key={phoneInputKey}
          autoFocus={true}
          onChangeNumber={p => {
            props.onChangeNumber(p)
            setPhoneNumber(p)
          }}
          onChangeValidity={setValidity}
          result={
            // Pass a component into PhoneInput so it is displayed inline with the number input box
            validity &&
            !!user && (
              <Kb.ClickableBox onClick={_onContinue}>
                <Kb.Box2 direction="horizontal" gap="tiny" fullWidth={true}>
                  <Kb.Avatar size={48} username={user.username} showFollowingStatus={true} />
                  <Kb.Box2 direction="vertical">
                    <Kb.Text type="BodySemibold" style={{color: Styles.globalColors.greenDark}}>
                      {user.username}
                    </Kb.Text>
                    <Kb.Text type="Body">{user.fullName}</Kb.Text>
                  </Kb.Box2>
                </Kb.Box2>
              </Kb.ClickableBox>
            )
          }
        />
        {validity && !user && <Kb.ProgressIndicator type="Small" />}
      </Kb.Box2>
      <Kb.Box
        style={{backgroundColor: Styles.globalColors.greyLight, flexDirection: 'column', flexGrow: 1}}
      />
      <Kb.Button
        style={{flexGrow: 0}}
        fullWidth={true}
        onClick={_onContinue}
        label="Continue"
        disabled={!(validity && !user)}
      />
    </Kb.ScrollView>
  )
}

export default PhoneSearch
