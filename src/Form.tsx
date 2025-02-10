import React, { useEffect, useState } from "react";
import type { FormProps } from "antd";
import { Button, Form, Input } from "antd";

import useGlobalStore from "./globalStore";
import { TaskType } from "./taskType";

type FieldType = {
    name?: string;
    description?: string;
};

const TodoForm: React.FC = () => {
    const { name, description } = useGlobalStore((state) => state.task);
    const createNewTask = useGlobalStore((state) => state.createTask);
    const [initValues, setInitValues] = useState<TaskType | null>(null);

    const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
        console.log("Success:", values);
        const randomId: number = Math.round(Math.random() * 1912);
        const data = {
            id: String(randomId),
            name: values!.name || "",
            description: values!.description || "",
        };
        createNewTask(data);
    };

    const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (
        errorInfo
    ) => {
        console.log("Failed:", errorInfo);
    };

    useEffect(() => {
        setInitValues({ name: name, description: description });
    }, [name, description]);

    return (
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
                initialValue={initValues?.name}
                rules={[{ required: true, message: "Please input name!" }]}
            >
                <Input />
            </Form.Item>

            <Form.Item<FieldType>
                label="Description"
                name="description"
                initialValue={initValues?.description}
                rules={[
                    { required: true, message: "Please input description!" },
                ]}
            >
                <Input />
            </Form.Item>

            <Form.Item label={null}>
                <Button
                    type="primary"
                    htmlType="submit"
                    className="submitButton"
                >
                    Create
                </Button>
            </Form.Item>
        </Form>
    );
};

export default TodoForm;
