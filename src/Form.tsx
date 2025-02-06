import React from "react";
import type { FormProps } from "antd";
import { Button, Form, Input } from "antd";

type FieldType = {
    name?: string;
    description?: string;
};

const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    console.log("Success:", values);
};

const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (errorInfo) => {
    console.log("Failed:", errorInfo);
};

const TodoForm: React.FC = () => (
    <Form
        id="createForm"
        name="basic"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
    >
        <Form.Item<FieldType>
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please input name!" }]}
        >
            <Input />
        </Form.Item>

        <Form.Item<FieldType>
            label="Description"
            name="description"
            rules={[{ required: true, message: "Please input description!" }]}
        >
            <Input />
        </Form.Item>

        <Form.Item label={null}>
            <Button type="primary" htmlType="submit" className="submitButton">
                Submit
            </Button>
        </Form.Item>
    </Form>
);

export default TodoForm;
