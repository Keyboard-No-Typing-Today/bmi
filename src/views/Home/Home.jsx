import { Form, Input, Selector, Button, NavBar, NoticeBar, Toast } from 'antd-mobile';

export default function HomeScreen({ onSubmit }) {
  const [form] = Form.useForm();

  const handleFinish = (v) => {
    const height = Number(v.height), weight = Number(v.weight), age = Number(v.age);
    if (!(height >= 50 && height <= 250)) return Toast.show({ content: '身高应在 50–250 cm' });
    if (!(weight >= 10 && weight <= 300)) return Toast.show({ content: '体重应在 10–300 kg' });
    if (!(age >= 1 && age <= 120)) return Toast.show({ content: '年龄应在 1–120 岁' });
    onSubmit({ height, weight, age, gender: v.gender });
  };

  return (
    <>
      <NavBar backIcon={null}>BMI Calculator</NavBar>
      <Form form={form} layout="vertical" onFinish={handleFinish}
        initialValues={{ gender: 'male' }}
        footer={<Button block type="submit" color="primary" size="large">计算 BMI</Button>}>
        <Form.Item name="height" label="身高 (cm)" rules={[{ required: true, message: '请输入身高' }]}>
          <Input type="number" placeholder="例如 170" />
        </Form.Item>
        <Form.Item name="weight" label="体重 (kg)" rules={[{ required: true, message: '请输入体重' }]}>
          <Input type="number" placeholder="例如 65" />
        </Form.Item>
        <Form.Item name="age" label="年龄 (岁)" rules={[{ required: true, message: '请输入年龄' }]}>
          <Input type="number" placeholder="例如 12" />
        </Form.Item>
        <Form.Item name="gender" label="性别">
          <Selector options={[{ label: '男', value: 'male' }, { label: '女', value: 'female' }]} />
        </Form.Item>
      </Form>
    </>
  );
}