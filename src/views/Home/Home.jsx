import { Form, Input, Selector, Button, NavBar, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import MenuButton from '../../components/MenuButton';

export default function HomeScreen({ onSubmit, onMenu }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const handleFinish = (v) => {
    const height = Number(v.height), weight = Number(v.weight), age = Number(v.age);
    if (!(height >= 50 && height <= 250)) return Toast.show({ content: t('err.height') });
    if (!(weight >= 10 && weight <= 300)) return Toast.show({ content: t('err.weight') });
    if (!(age >= 1 && age <= 120)) return Toast.show({ content: t('err.age') });
    onSubmit({ height, weight, age, gender: v.gender });
  };

  return (
    <div className="page">
      <NavBar backIcon={null} right={<MenuButton onClick={onMenu} />}>
        {t('nav.home')}
      </NavBar>

      <div className="home-wrap">
        <div className="home-form">
          <Form form={form} layout="vertical" onFinish={handleFinish}
            initialValues={{ gender: 'male' }}
            footer={<Button block type="submit" color="primary" size="large">{t('form.submit')}</Button>}>
            <Form.Item name="height" label={t('form.height')} rules={[{ required: true, message: t('form.requiredHeight') }]}>
              <Input type="number" placeholder={t('form.phHeight')} />
            </Form.Item>
            <Form.Item name="weight" label={t('form.weight')} rules={[{ required: true, message: t('form.requiredWeight') }]}>
              <Input type="number" placeholder={t('form.phWeight')} />
            </Form.Item>
            <Form.Item name="age" label={t('form.age')} rules={[{ required: true, message: t('form.requiredAge') }]}>
              <Input type="number" placeholder={t('form.phAge')} />
            </Form.Item>
            <Form.Item name="gender" label={t('form.gender')}>
              <Selector
                options={[
                  { label: t('form.male'), value: 'male' },
                  { label: t('form.female'), value: 'female' },
                ]}
              />
            </Form.Item>
          </Form>
        </div>

        {/* 只有横屏才显示：竖屏时 CSS 里 display:none */}
        <div className="home-side">
          <div className="brand">BMI</div>
          <div className="tagline">{t('app.tagline')}</div>
        </div>
      </div>
    </div>
  );
}
